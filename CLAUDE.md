# Job Hunter - AI Job Scraper for Australia

Open-source web app + CLI that scrapes 5 job boards across Adelaide/Sydney/Melbourne, uses AI to parse any PDF resume, and scores jobs by fit.

## Architecture

```
web/          → Next.js T3 app (tRPC + Prisma + Tailwind) — Vercel
worker/       → FastAPI Python worker (scrapers + scoring) — Railway
scrape.py     → Core scraping + scoring engine
scrapers_au.py → Seek, Prosple, GradConnection, LinkedIn scrapers
email_digest.py → HTML email rendering + Gmail SMTP
resumes/      → LaTeX resume files (CLI mode)
```

## Web App (web/)

```bash
cd web && npm run dev           # Start dev server
npm run db:push                 # Push schema to Neon
```

### Pipeline: Upload → Email
1. User uploads PDF resume + enters email
2. Claude API parses resume → structured profile (skills, tiers, keywords)
3. Railway worker scrapes 5 job boards
4. Deterministic algorithm scores jobs against profile
5. HTML email digest sent to user

### Stack
- Next.js 15 + tRPC + Prisma + Tailwind (T3 App)
- Neon Postgres
- Claude API (resume parsing)
- Railway (Python worker)
- Vercel (frontend)

## Python Worker (worker/)

```bash
cd worker && uvicorn main:app --reload    # Start locally
```

Endpoints:
- `POST /api/scrape` — accepts profile JSON, runs scraping + scoring + email
- `GET /health` — health check
- `POST /api/callback` — webhook from Vercel to trigger worker

## CLI Mode

```
/find-jobs                          # Full run: 3 cities x 6 role searches
/find-jobs --hours 24               # Last 24 hours only
/find-jobs --big-tech               # Only big tech / notable AU companies
/find-jobs --location Sydney        # Single city
/find-jobs --search "DevOps"        # Custom search term
/find-jobs --top 50                 # Show more results
```

```bash
uv run python scrape.py
uv run python scrape.py --big-tech --hours 24
uv run python scrape.py --location Adelaide --search "React Developer"
```

## Scoring

| Factor | Points |
|--------|--------|
| Big Tech company (Google, Meta, Atlassian...) | +12 |
| AU Notable company (Canva, Seek, REA Group...) | +10 |
| Top Tech company (Anthropic, Vercel, Figma...) | +8 |
| Adelaide location | +15 |
| Sydney/Melbourne location | +12 |
| Remote | +5 |
| Graduate/Full Stack title | +18 |
| Frontend title | +15 |
| Software Engineer title | +14 |
| Core skill match (React, TS, Next.js) | +5 each |
| Strong skill match (Django, Docker) | +3 each |
| Peripheral skill match | +1 each |
| Visa/sponsorship signals | +4 each (cap 12) |
| Recency (posted today) | +10 |
| Negative title (non-engineering) | -20 |
| Senior+ seniority | -5 |

## Environment Variables

See `web/.env.example` and `.env.example` for required variables.
