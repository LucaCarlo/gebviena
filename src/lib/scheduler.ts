/**
 * Scheduled-emails worker — picks pending jobs and runs them.
 *
 * Used by:
 *  - src/instrumentation.ts (in-process setInterval, fires every 60s)
 *  - src/app/api/scheduled-emails/process/route.ts (manual / debug trigger)
 */
import { prisma } from "@/lib/prisma";
import { sendBulkNewsletterEmails } from "@/lib/newsletter-sender";

const MAX_JOBS_PER_TICK = 5;

export interface JobResult {
  id: string;
  status: "completed" | "failed";
  sent?: number;
  failed?: number;
  error?: string;
}

export async function processScheduledEmails(): Promise<{ processed: number; results: JobResult[] }> {
  const now = new Date();
  const dueJobs = await prisma.scheduledEmailJob.findMany({
    where: { status: "pending", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_JOBS_PER_TICK,
  });

  if (dueJobs.length === 0) {
    return { processed: 0, results: [] };
  }

  const results: JobResult[] = [];

  for (const job of dueJobs) {
    // Atomic claim — only proceed if the row is still pending
    const claim = await prisma.scheduledEmailJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "processing", startedAt: new Date() },
    });
    if (claim.count === 0) continue;

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

      results.push({
        id: job.id,
        status: result.success ? "completed" : "failed",
        sent: result.sent,
        failed: result.failed,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.scheduledEmailJob.update({
        where: { id: job.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: msg.slice(0, 500) },
      });
      results.push({ id: job.id, status: "failed", error: msg });
    }
  }

  return { processed: results.length, results };
}
