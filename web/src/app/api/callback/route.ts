import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  // Verify auth
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (env.WORKER_SECRET && token !== env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    submissionId: string;
    status: string;
    jobCount?: number;
    error?: string;
  };

  const { submissionId, status, error } = body;

  if (!submissionId || !status) {
    return NextResponse.json(
      { error: "Missing submissionId or status" },
      { status: 400 },
    );
  }

  const dbStatus =
    status === "completed"
      ? "COMPLETE"
      : status === "failed"
        ? "FAILED"
        : "SCRAPING";

  await db.submission.update({
    where: { id: submissionId },
    data: {
      status: dbStatus as "COMPLETE" | "FAILED" | "SCRAPING",
      error: error ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
