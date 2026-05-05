/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * Sets up a 60-second ticker that processes scheduled email jobs whose
 * `scheduledAt <= now`. The flag on globalThis prevents double-registration
 * during dev hot-reload and across multiple worker invocations.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // only run server-side

  const g = globalThis as unknown as { __schedulerStarted?: boolean };
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;

  // Lazy import: keeps prisma out of the edge bundle
  const { processScheduledEmails } = await import("./lib/scheduler");

  const TICK_MS = 60_000;
  const tick = async () => {
    try {
      const out = await processScheduledEmails();
      if (out.processed > 0) {
        console.log(`[scheduler] processed ${out.processed} job(s):`, out.results.map(r => `${r.id}=${r.status}`).join(", "));
      }
    } catch (e) {
      console.error("[scheduler] tick error:", e);
    }
  };

  // Initial run after 30s (give the server time to fully boot), then every minute
  setTimeout(() => {
    tick();
    setInterval(tick, TICK_MS);
  }, 30_000);

  console.log("[scheduler] in-process ticker registered (60s)");
}
