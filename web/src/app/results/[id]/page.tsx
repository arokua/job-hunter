import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";

function getScoreClass(score: number): string {
  if (score >= 50) return "score-high";
  if (score >= 30) return "score-mid";
  return "score-low";
}

function getTierClass(tier: string | null): string {
  if (!tier) return "";
  const normalized = tier.toLowerCase();
  if (normalized.includes("big tech")) return "tier-big-tech";
  if (normalized.includes("au notable")) return "tier-au-notable";
  if (normalized.includes("top tech")) return "tier-top-tech";
  return "";
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path
        d="M10.5 7.5v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3M8.5 2.5h3v3M6 8l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5h11M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

interface Skill {
  name: string;
  tier?: string;
}

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  site: string;
  score: number;
  tier: string | null;
  seniority: string | null;
  datePosted: string | null;
  salary: string | null;
  isRemote: boolean;
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await api.submission.getResults({ id });
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  const jobs = data.jobs as unknown as JobResult[];
  const profileSkills = (data.profile?.skills ?? []) as unknown as Skill[];
  const profileTitles = (data.profile?.titles ?? []) as unknown as string[];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <nav className="sticky top-0 z-30 border-b border-navy-800 bg-navy-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-navy-950" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-serif text-lg text-white">Job Hunter</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="font-sans text-xs text-navy-500">
              {jobs.length} jobs found
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        {/* Profile summary */}
        {(profileSkills.length > 0 || profileTitles.length > 0) && (
          <section className="mb-10 rounded-2xl border border-navy-700/50 bg-navy-800/30 p-6 md:p-8">
            <h2 className="font-serif text-xl text-white mb-4">
              Your profile
            </h2>
            {profileTitles.length > 0 && (
              <div className="mb-4">
                <p className="font-sans text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2">
                  Titles
                </p>
                <div className="flex flex-wrap gap-2">
                  {profileTitles.map((title, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full font-sans text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profileSkills.length > 0 && (
              <div>
                <p className="font-sans text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2">
                  Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {profileSkills.map((skill, i) => (
                    <span
                      key={i}
                      className={`
                        px-3 py-1 rounded-full font-sans text-xs font-medium border
                        ${
                          skill.tier === "core"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : skill.tier === "strong"
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                              : "border-navy-500/30 bg-navy-500/10 text-navy-300"
                        }
                      `}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Results heading */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-white md:text-4xl">
              Results
            </h1>
            <p className="font-sans text-sm text-navy-400 mt-1">
              Ranked by match score against your resume
            </p>
          </div>
          <p className="font-sans text-sm text-navy-500">
            {jobs.length} listings
          </p>
        </div>

        {/* Job cards */}
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-navy-700/50 bg-navy-800/30 p-12 text-center">
            <p className="font-sans text-navy-400">
              No jobs found. Try again with different preferences.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <article
                key={job.id}
                className="
                  group rounded-xl border border-navy-700/40 bg-navy-800/30
                  p-5 md:p-6 transition-all duration-200
                  hover:border-navy-600 hover:bg-navy-800/50
                "
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-base font-semibold text-white hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 group/link"
                      >
                        <span className="truncate">{job.title}</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 text-navy-500 group-hover/link:text-amber-400 transition-colors flex-shrink-0" />
                      </a>
                    </div>

                    <p className="font-sans text-sm text-navy-300 mb-2">
                      {job.company}
                    </p>

                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5">
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-navy-400">
                        <LocationIcon className="w-3 h-3" />
                        {job.location}
                        {job.isRemote && (
                          <span className="ml-1 text-emerald-400">(Remote)</span>
                        )}
                      </span>

                      {job.datePosted && (
                        <span className="inline-flex items-center gap-1 font-sans text-xs text-navy-500">
                          <CalendarIcon className="w-3 h-3" />
                          {job.datePosted}
                        </span>
                      )}

                      <span className="font-sans text-xs text-navy-600">
                        via {job.site}
                      </span>
                    </div>
                  </div>

                  {/* Right: badges */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap md:flex-nowrap">
                    {job.seniority && (
                      <span className="px-2.5 py-1 rounded-md font-sans text-xs font-medium border border-navy-600 bg-navy-700/60 text-navy-300">
                        {job.seniority}
                      </span>
                    )}

                    {job.tier && (
                      <span
                        className={`px-2.5 py-1 rounded-md font-sans text-xs font-medium ${getTierClass(job.tier)}`}
                      >
                        {job.tier}
                      </span>
                    )}

                    <span
                      className={`px-3 py-1 rounded-md font-sans text-sm font-bold tabular-nums ${getScoreClass(job.score)}`}
                    >
                      {Math.round(job.score)}
                    </span>
                  </div>
                </div>

                {job.salary && (
                  <p className="mt-2 font-sans text-xs text-navy-500">
                    {job.salary}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Footer link */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="font-sans text-sm text-navy-500 hover:text-navy-300 transition-colors"
          >
            Run another search
          </Link>
        </div>
      </div>
    </main>
  );
}
