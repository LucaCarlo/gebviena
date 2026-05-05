/**
 * Worker endpoint — invoked every minute by a systemd timer.
 *
 * Auth: header `X-Scheduler-Token` must match `process.env.SCHEDULER_TOKEN`.
 * The endpoint MUST not be exposed to the public; only call from localhost.
 *
 * Picks scheduled jobs whose `scheduledAt <= now` and `status = pending`,
 * marks them `processing`, sends the bulk email via the shared sender, then
 * marks `completed` (or `failed` on error).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBulkNewsletterEmails } from "@/lib/newsletter-sender";

export const dynamic = "force-dynamic";

const MAX_JOBS_PER_TICK = 5; // safety cap — avoid running 100 jobs in one minute

export async function POST(req: Request) {
  const token = req.headers.get("x-scheduler-token") || "";
  const expected = process.env.SCHEDULER_TOKEN || "";
  if (!expected || token !== expected) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const dueJobs = await prisma.scheduledEmailJob.findMany({
    where: { status: "pending", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_JOBS_PER_TICK,
  });

  if (dueJobs.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const results: Array<{ id: string; status: string; sent?: number; failed?: number; error?: string }> = [];

  for (const job of dueJobs) {
    // Atomic claim — only proceed if we successfully transition pending → processing
    const claim = await prisma.scheduledEmailJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "processing", startedAt: new Date() },
    });
    if (claim.count === 0) {
      // someone else picked it up
      continue;
    }

    try {
      const subscriberIds: string[] = JSON.parse(job.subscriberIds || "[]");
      const result = await sendBulkNewsletterEmails({
        subscriberIds,
        templateId: job.templateId,
        landingPageId: job.landingPageId || undefined,
      });

      await prisma.scheduledEmailJob.update({
        where: { id: job.id },
        data: {
          status: result.success ? "completed" : "failed",
          completedAt: new Date(),
          sentCount: result.sent,
          failedCount: result.failed,
          errorMessage: result.success ? null : (result.error || "Send error"),
        },
      });

      results.push({ id: job.id, status: result.success ? "completed" : "failed", sent: result.sent, failed: result.failed });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.scheduledEmailJob.update({
        where: { id: job.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: msg.slice(0, 500) },
      });
      results.push({ id: job.id, status: "failed", error: msg });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
