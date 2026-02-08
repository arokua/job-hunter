"""
FastAPI worker API for Job Hunter — wraps the existing Python scrapers.

Accepts scrape requests from the Next.js frontend, runs scrapers in the
background, scores jobs against the AI-parsed profile, and sends an email
digest with results.

Endpoints:
    POST /api/scrape  — queue a scrape job (auth required)
    GET  /health      — liveness check
"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

# ── Add parent directory to sys.path so we can import existing modules ───────
_PARENT_DIR = str(Path(__file__).resolve().parent.parent)
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)

from email_digest import render_email_html, send_email  # noqa: E402
from scrape import (  # noqa: E402
    LOCATIONS,
    ROLE_SEARCHES,
    SKILL_TIERS,
    classify_company,
    deduplicate,
    detect_seniority,
    score_job,
    scrape_all,
)

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("worker")

# Suppress noisy third-party logs
logging.getLogger("JobSpy").setLevel(logging.WARNING)
logging.getLogger("tls_client").setLevel(logging.WARNING)

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Job Hunter Worker",
    description="Background job scraper API for Job Hunter",
    version="1.0.0",
)

security = HTTPBearer()

# ── Env ──────────────────────────────────────────────────────────────────────
WORKER_SECRET = os.environ.get("WORKER_SECRET", "")
CALLBACK_URL = os.environ.get("CALLBACK_URL", "")  # Next.js app callback


# ── Pydantic Models ──────────────────────────────────────────────────────────

class Skill(BaseModel):
    name: str
    tier: str = "peripheral"  # "core" | "strong" | "peripheral"


class Profile(BaseModel):
    skills: list[Skill] = []
    titles: list[str] = []
    keywords: list[str] = []


class Preferences(BaseModel):
    locations: list[str] = []
    roles: list[str] = []
    hours_old: int = 72
    results_per_search: int = 30


class ScoringWeights(BaseModel):
    companyTier: float = 1.0
    location: float = 1.0
    titleMatch: float = 1.0
    skills: float = 1.0
    sponsorship: float = 1.0
    recency: float = 1.0


class ScrapeRequest(BaseModel):
    submissionId: str
    email: str
    profile: Profile
    preferences: Preferences = Preferences()
    scoringWeights: Optional[ScoringWeights] = None


class ScrapeStatus(BaseModel):
    submissionId: str
    status: str
    message: str


# ── Auth ─────────────────────────────────────────────────────────────────────

def verify_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify the Bearer token matches WORKER_SECRET."""
    if not WORKER_SECRET:
        raise HTTPException(
            status_code=500,
            detail="WORKER_SECRET not configured on server",
        )
    if credentials.credentials != WORKER_SECRET:
        raise HTTPException(status_code=401, detail="Invalid authorization token")
    return credentials.credentials


# ── Profile Conversion ───────────────────────────────────────────────────────

TIER_WEIGHTS = {
    "core": 5,
    "strong": 3,
    "peripheral": 1,
}


def convert_profile(profile: Profile) -> dict:
    """Convert the AI-parsed profile into the format expected by score_job().

    - profile.skills becomes a set of skill name strings (for skill matching)
    - profile.keywords stays as a set of strings
    - profile.titles stays as a list of strings
    - Dynamically builds SKILL_TIERS dict from the AI profile's tier field
    """
    # Build skill names set for score_job()'s profile["skills"]
    skill_names: set[str] = set()
    for skill in profile.skills:
        skill_names.add(skill.name)

    # Dynamically override SKILL_TIERS with the AI-parsed tier weights
    # This patches the module-level dict so score_job() picks up the new weights
    for skill in profile.skills:
        weight = TIER_WEIGHTS.get(skill.tier, 1)
        SKILL_TIERS[skill.name.lower()] = weight

    return {
        "skills": skill_names,
        "titles": profile.titles,
        "keywords": set(profile.keywords),
    }


def resolve_locations(preference_locations: list[str]) -> list[str]:
    """Map short location names to the full format expected by scrape_all()."""
    if not preference_locations:
        return LOCATIONS

    loc_map = {
        "adelaide": "Adelaide, Australia",
        "sydney": "Sydney, Australia",
        "melbourne": "Melbourne, Australia",
    }

    resolved = []
    for loc in preference_locations:
        mapped = loc_map.get(loc.lower().strip())
        if mapped:
            resolved.append(mapped)
        else:
            # Allow pass-through for custom locations like "Brisbane, Australia"
            resolved.append(loc)

    return resolved if resolved else LOCATIONS


# ── Background Task ──────────────────────────────────────────────────────────

def run_scrape_job(request: ScrapeRequest):
    """Execute the full scrape + score + email pipeline in the background."""
    submission_id = request.submissionId
    logger.info(f"[{submission_id}] Starting scrape job for {request.email}")

    try:
        # 1. Convert AI-parsed profile to score_job() format
        profile = convert_profile(request.profile)
        logger.info(
            f"[{submission_id}] Profile: "
            f"{len(profile['skills'])} skills, "
            f"{len(profile['titles'])} titles, "
            f"{len(profile['keywords'])} keywords"
        )

        # 2. Resolve preferences
        locations = resolve_locations(request.preferences.locations)
        search_terms = request.preferences.roles if request.preferences.roles else ROLE_SEARCHES

        defaults = {
            "sites": ["indeed"],
            "results_wanted": request.preferences.results_per_search,
            "hours_old": request.preferences.hours_old,
            "job_type": None,
        }

        logger.info(
            f"[{submission_id}] Scraping "
            f"{len(locations)} locations x {len(search_terms)} roles"
        )

        # 3. Run scrapers
        jobs = scrape_all(locations, search_terms, defaults)

        if jobs.empty:
            logger.warning(f"[{submission_id}] No jobs found")
            _send_empty_notification(request)
            _post_callback(submission_id, "completed", 0)
            return

        # 3b. Filter to AU target cities
        if "location" in jobs.columns:
            target_cities = {"adelaide", "sydney", "melbourne", "remote", "australia"}
            loc_lower = jobs["location"].fillna("").str.lower()
            au_mask = loc_lower.apply(lambda loc: any(c in loc for c in target_cities))
            before_filter = len(jobs)
            jobs = jobs[au_mask].reset_index(drop=True)
            filtered_count = before_filter - len(jobs)
            if filtered_count:
                logger.info(f"[{submission_id}] Filtered {filtered_count} non-AU jobs")

        # 4. Score all jobs
        logger.info(f"[{submission_id}] Scoring {len(jobs)} jobs")
        jobs["tier"] = jobs["company"].apply(classify_company) if "company" in jobs.columns else ""
        jobs["seniority"] = jobs["title"].apply(detect_seniority) if "title" in jobs.columns else ""
        jobs["seniority"] = jobs["seniority"].replace("", "mid")
        # Convert scoring weights to dict for score_job()
        weights_dict = None
        if request.scoringWeights:
            weights_dict = request.scoringWeights.model_dump()

        jobs["score"] = jobs.apply(lambda row: score_job(row, profile, weights_dict), axis=1)
        jobs = jobs.sort_values("score", ascending=False).reset_index(drop=True)

        # 5. Render and send email digest
        logger.info(f"[{submission_id}] Sending email to {request.email}")
        email_html = render_email_html(jobs, min_score=20.0)
        today = datetime.now().strftime("%d %b %Y")
        above_threshold = len(jobs[jobs["score"] >= 20.0])

        if above_threshold:
            subject = f"Job Hunter: {above_threshold} relevant jobs ({today})"
        else:
            subject = f"Job Hunter: No strong matches today ({today})"

        email_sent = send_email(subject, email_html, to=request.email)

        if email_sent:
            logger.info(f"[{submission_id}] Email sent successfully")
        else:
            logger.error(f"[{submission_id}] Failed to send email")

        # 6. POST results back to Next.js app
        _post_callback(submission_id, "completed", len(jobs))

        logger.info(
            f"[{submission_id}] Done: {len(jobs)} jobs scored, "
            f"top score {jobs['score'].max():.0f}"
        )

    except Exception as e:
        logger.exception(f"[{submission_id}] Scrape job failed: {e}")
        _post_callback(submission_id, "failed", 0, error=str(e))


def _send_empty_notification(request: ScrapeRequest):
    """Send a brief email when no jobs were found."""
    today = datetime.now().strftime("%d %b %Y")
    html_body = f"""<!DOCTYPE html>
<html><body style="font-family:sans-serif;padding:20px;">
<h2>Job Hunter - No Jobs Found</h2>
<p>Your scrape on {today} returned no results.</p>
<p>This can happen if the job boards are rate-limiting or if the search criteria are too narrow.</p>
<p>Try broadening your location or role preferences.</p>
</body></html>"""

    send_email(
        subject=f"Job Hunter: No jobs found ({today})",
        html_body=html_body,
        to=request.email,
    )


def _post_callback(
    submission_id: str,
    status: str,
    job_count: int,
    error: Optional[str] = None,
):
    """POST results back to the Next.js app callback URL."""
    if not CALLBACK_URL:
        logger.info(f"[{submission_id}] No CALLBACK_URL configured, skipping callback")
        return

    import requests as req

    payload = {
        "submissionId": submission_id,
        "status": status,
        "jobCount": job_count,
    }
    if error:
        payload["error"] = error

    try:
        resp = req.post(
            CALLBACK_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {WORKER_SECRET}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        logger.info(
            f"[{submission_id}] Callback POST {CALLBACK_URL} -> {resp.status_code}"
        )
    except Exception as e:
        logger.error(f"[{submission_id}] Callback failed: {e}")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness check."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


@app.post("/api/scrape", response_model=ScrapeStatus)
def start_scrape(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    _token: str = Depends(verify_auth),
):
    """Accept a scrape request and process it in the background.

    Returns immediately with status "queued". The actual scraping, scoring,
    and email sending happens asynchronously via FastAPI BackgroundTasks.
    """
    logger.info(
        f"Received scrape request: submissionId={request.submissionId}, "
        f"email={request.email}, "
        f"skills={len(request.profile.skills)}, "
        f"locations={request.preferences.locations}, "
        f"roles={request.preferences.roles}"
    )

    background_tasks.add_task(run_scrape_job, request)

    return ScrapeStatus(
        submissionId=request.submissionId,
        status="queued",
        message="Scrape job queued. Results will be emailed.",
    )
