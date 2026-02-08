import { env } from "~/env";

interface ScoringWeights {
  companyTier: number;
  location: number;
  titleMatch: number;
  skills: number;
  sponsorship: number;
  recency: number;
}

interface WorkerPayload {
  submissionId: string;
  email: string;
  profile: {
    skills: Array<{ name: string; tier: string }>;
    titles: string[];
    keywords: string[];
  };
  preferences: Record<string, unknown> | null;
  scoringWeights: ScoringWeights | null;
}

export async function triggerWorker(payload: WorkerPayload): Promise<void> {
  const workerUrl = env.WORKER_URL;

  if (!workerUrl) {
    console.warn(
      "WORKER_URL not set — skipping worker trigger. Set WORKER_URL to your Railway Python worker endpoint.",
    );
    return;
  }

  const response = await fetch(`${workerUrl}/api/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.WORKER_SECRET && {
        Authorization: `Bearer ${env.WORKER_SECRET}`,
      }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Worker returned ${response.status}: ${text}`);
  }
}
