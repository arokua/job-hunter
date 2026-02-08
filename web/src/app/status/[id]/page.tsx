"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { api } from "~/trpc/react";

const STEPS = [
  { key: "PARSING", label: "Parse Resume", description: "Extracting skills & experience" },
  { key: "SCRAPING", label: "Scrape Jobs", description: "Searching 5 job boards" },
  { key: "SCORING", label: "Score Matches", description: "Ranking against your profile" },
  { key: "SENDING", label: "Send Email", description: "Delivering your digest" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PARSING: 1,
  AWAITING_REVIEW: 1,
  SCRAPING: 2,
  SCORING: 3,
  SENDING: 4,
  COMPLETE: 5,
  FAILED: -1,
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path
        className="checkmark-animate"
        d="M5 10.5l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="10"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="22 22"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#f59e0b", "#fbbf24", "#10b981", "#60a5fa", "#f43f5e", "#a78bfa", "#22d3ee"];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${Math.random() * 1.2}s`,
      duration: `${1.8 + Math.random() * 1.5}s`,
      size: `${5 + Math.random() * 6}px`,
      rotation: `${Math.random() * 360}deg`,
    }));
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </>
  );
}

export default function StatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [showConfetti, setShowConfetti] = useState(false);

  const cancelJob = api.submission.cancelJob.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  const { data, error, isLoading } = api.submission.getStatus.useQuery(
    { id },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "COMPLETE" || status === "FAILED") return false;
        return 2000;
      },
    },
  );

  useEffect(() => {
    if (data?.status === "COMPLETE") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
    if (data?.status === "AWAITING_REVIEW") {
      router.push(`/profile/${id}`);
    }
  }, [data?.status, id, router]);

  const currentStepIndex = data ? (STATUS_ORDER[data.status] ?? 0) : 0;
  const isFailed = data?.status === "FAILED";
  const isComplete = data?.status === "COMPLETE";

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <SpinnerIcon className="w-8 h-8 text-amber-500" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-white mb-3">Not found</h1>
          <p className="font-sans text-navy-400 mb-6">
            This submission does not exist or has expired.
          </p>
          <Link
            href="/"
            className="font-sans text-sm text-amber-500 hover:text-amber-400 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {showConfetti && <Confetti />}

      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-navy-950" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-serif text-xl text-white">Job Hunter</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          {/* Status heading */}
          <div className="text-center mb-12">
            {isComplete ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-5">
                  <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <path
                      className="checkmark-animate"
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h1 className="font-serif text-4xl text-white mb-2">
                  Check your email!
                </h1>
                <p className="font-sans text-navy-300 text-lg">
                  Your ranked job matches have been sent.
                </p>
              </>
            ) : isFailed ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 mb-5">
                  <svg className="w-8 h-8 text-rose-400" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h1 className="font-serif text-4xl text-white mb-2">
                  Something went wrong
                </h1>
                <p className="font-sans text-navy-300 text-base mb-1">
                  {data?.error ?? "An unexpected error occurred."}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-4xl text-white mb-2">
                  Hunting jobs...
                </h1>
                <p className="font-sans text-navy-400 text-base">
                  This usually takes 2-5 minutes.
                </p>
              </>
            )}
          </div>

          {/* Step indicator */}
          <div className="space-y-0">
            {STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = currentStepIndex === stepNumber;
              const isDone = currentStepIndex > stepNumber;
              const isFailedAtStep = isFailed && currentStepIndex === stepNumber;

              return (
                <div key={step.key} className="flex items-stretch gap-4">
                  {/* Left column: circle + connector line */}
                  <div className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`
                        relative flex items-center justify-center
                        w-10 h-10 rounded-full border-2
                        transition-all duration-500
                        ${
                          isFailedAtStep
                            ? "border-rose-500 bg-rose-500/15"
                            : isDone
                              ? "border-emerald-500 bg-emerald-500/15"
                              : isActive
                                ? "border-amber-500 bg-amber-500/10 pulse-glow"
                                : "border-navy-600 bg-navy-800"
                        }
                      `}
                    >
                      {isDone ? (
                        <CheckIcon className="w-5 h-5 text-emerald-400" />
                      ) : isActive && !isFailed ? (
                        <SpinnerIcon className="w-5 h-5 text-amber-400" />
                      ) : isFailedAtStep ? (
                        <svg className="w-5 h-5 text-rose-400" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M6 6l8 8M14 6l-8 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <span className="font-sans text-xs font-bold text-navy-500">
                          {stepNumber}
                        </span>
                      )}
                    </div>

                    {/* Connector line */}
                    {index < STEPS.length - 1 && (
                      <div className="w-px flex-1 min-h-[24px]">
                        <div
                          className={`w-full h-full transition-colors duration-500 ${
                            isDone ? "bg-emerald-500/40" : "bg-navy-700"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right column: text */}
                  <div className={`pb-8 ${index === STEPS.length - 1 ? "pb-0" : ""}`}>
                    <p
                      className={`font-sans text-sm font-medium transition-colors duration-300 ${
                        isFailedAtStep
                          ? "text-rose-400"
                          : isDone
                            ? "text-emerald-400"
                            : isActive
                              ? "text-white"
                              : "text-navy-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`font-sans text-xs mt-0.5 transition-colors duration-300 ${
                        isActive && !isFailed ? "text-navy-300" : "text-navy-600"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-10 flex flex-col items-center gap-3">
            {isComplete && data?.hasResults && (
              <Link
                href={`/results/${id}`}
                className="
                  inline-flex items-center gap-2 rounded-xl px-6 py-3
                  bg-amber-500 text-navy-950 font-sans font-semibold text-sm
                  hover:bg-amber-400 transition-all duration-200
                  hover:shadow-lg hover:shadow-amber-500/20
                "
              >
                View results
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10m-4-4 4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
            {isFailed && (
              <Link
                href="/"
                className="
                  inline-flex items-center gap-2 rounded-xl px-6 py-3
                  border border-navy-600 text-navy-200 font-sans font-medium text-sm
                  hover:border-navy-400 hover:text-white transition-all duration-200
                "
              >
                Try again
              </Link>
            )}
            {!isComplete && !isFailed && (
              <button
                type="button"
                onClick={() => cancelJob.mutate({ submissionId: id })}
                disabled={cancelJob.isPending}
                className="
                  inline-flex items-center gap-2 rounded-xl px-6 py-3
                  border border-navy-700 text-navy-400 font-sans text-sm
                  hover:border-rose-500/40 hover:text-rose-400 transition-all duration-200
                "
              >
                {cancelJob.isPending ? "Cancelling..." : "Cancel job"}
              </button>
            )}
          </div>

          {/* Submission ID */}
          <p className="mt-8 text-center font-sans text-xs text-navy-600">
            ID: {id}
          </p>
        </div>
      </div>
    </main>
  );
}
