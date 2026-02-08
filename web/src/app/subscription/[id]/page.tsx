"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function SubscriptionPage() {
  const params = useParams<{ id: string }>();
  const utils = api.useUtils();

  const { data: sub, isLoading, isError } = api.subscription.get.useQuery(
    { id: params.id },
    { refetchInterval: 30_000 },
  );

  const updateStatus = api.subscription.updateStatus.useMutation({
    onSuccess: () => {
      void utils.subscription.get.invalidate({ id: params.id });
    },
  });

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-amber-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
          <p className="font-sans text-navy-400">Loading subscription...</p>
        </div>
      </main>
    );
  }

  if (isError || !sub) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-2xl text-white mb-2">Subscription not found</h1>
          <p className="font-sans text-navy-400 mb-6">This subscription may have expired or been cancelled.</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 bg-amber-500 text-navy-950 font-sans font-semibold text-sm hover:bg-amber-400 transition-all">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    PAUSED: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    CANCELLED: "text-navy-400 bg-navy-700/50 border-navy-600",
    EXPIRED: "text-navy-400 bg-navy-700/50 border-navy-600",
  };

  const daysRemaining = sub.expiresAt
    ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleAction = (status: "ACTIVE" | "PAUSED" | "CANCELLED") => {
    updateStatus.mutate({ id: sub.id, email: sub.email, status });
  };

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-navy-800 bg-navy-950/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="font-serif text-lg text-white hover:text-amber-400 transition-colors">
              Job Hunter
            </Link>
            <span className="text-navy-600 mx-2">/</span>
            <span className="font-sans text-sm text-navy-400">Subscription</span>
          </div>
          <span className="font-sans text-xs text-navy-500">{sub.email}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-white mb-3">
            Daily <span className="text-amber-400">digest</span> active
          </h1>
          <p className="font-sans text-base text-navy-300">
            You&apos;ll receive fresh job matches every morning based on your scoring profile.
          </p>
        </div>

        {/* Status card */}
        <div className="rounded-xl border border-navy-700 bg-navy-800/40 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-sans font-medium border ${statusColors[sub.status] ?? statusColors.CANCELLED}`}>
              {sub.status}
            </span>
            {daysRemaining !== null && sub.status === "ACTIVE" && (
              <span className="font-sans text-sm text-navy-400">
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
              </span>
            )}
            {sub.duration === 0 && sub.status === "ACTIVE" && (
              <span className="font-sans text-sm text-navy-400">Indefinite</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm font-sans">
            <div>
              <p className="text-navy-500 mb-1">Next delivery</p>
              <p className="text-white">
                {sub.status === "ACTIVE"
                  ? new Date(sub.nextRunAt).toLocaleDateString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-navy-500 mb-1">Last delivery</p>
              <p className="text-white">
                {sub.lastRunAt
                  ? new Date(sub.lastRunAt).toLocaleDateString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Not yet"}
              </p>
            </div>
            <div>
              <p className="text-navy-500 mb-1">Duration</p>
              <p className="text-white">
                {sub.duration === 0 ? "Indefinite" : `${sub.duration} days`}
              </p>
            </div>
            <div>
              <p className="text-navy-500 mb-1">Created</p>
              <p className="text-white">
                {new Date(sub.createdAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          {sub.status === "ACTIVE" && (
            <button
              onClick={() => handleAction("PAUSED")}
              disabled={updateStatus.isPending}
              className="flex-1 rounded-xl px-4 py-3 border border-navy-600 bg-navy-800/60 font-sans text-sm font-medium text-navy-300 hover:border-navy-400 hover:text-navy-100 transition-all disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {sub.status === "PAUSED" && (
            <button
              onClick={() => handleAction("ACTIVE")}
              disabled={updateStatus.isPending}
              className="flex-1 rounded-xl px-4 py-3 border border-amber-500/40 bg-amber-500/10 font-sans text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {(sub.status === "ACTIVE" || sub.status === "PAUSED") && (
            <button
              onClick={() => handleAction("CANCELLED")}
              disabled={updateStatus.isPending}
              className="flex-1 rounded-xl px-4 py-3 border border-rose-500/30 bg-rose-500/10 font-sans text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Run history */}
        {sub.runs.length > 0 && (
          <div>
            <h2 className="font-serif text-lg text-white mb-4">Recent deliveries</h2>
            <div className="space-y-2">
              {sub.runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border border-navy-700 bg-navy-800/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        run.status === "completed"
                          ? "bg-emerald-400"
                          : run.status === "failed"
                            ? "bg-rose-400"
                            : "bg-amber-400"
                      }`}
                    />
                    <span className="font-sans text-sm text-navy-300">
                      {new Date(run.createdAt).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className="font-sans text-xs text-navy-500">
                    {run.status === "completed"
                      ? `${run.jobCount} jobs`
                      : run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
