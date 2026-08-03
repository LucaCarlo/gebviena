/**
 * Script one-shot: applica auto-ban IP scanner (ultimi 7gg) + rigenera snapshot oggi.
 * Uso: npx tsx scripts/cron-analytics-run-now.ts
 */
import { prisma } from "../src/lib/prisma";
import { snapshotDayHost } from "../src/lib/analytics-snapshot";

interface SecuritySettings {
  autoBanEnabled: boolean;
  hitsPerHourThreshold: number;
  hitsPerPathPerHourThreshold: number;
  autoBanDurationHours: number;
}
const DEFAULT: SecuritySettings = {
  autoBanEnabled: true,
  hitsPerHourThreshold: 300,
  hitsPerPathPerHourThreshold: 50,
  autoBanDurationHours: 168,
};

async function main() {
  const t0 = Date.now();

  // ── 1) Load security settings ──────────────────────────────
  const row = await prisma.setting.findUnique({ where: { key: "security_settings" } });
  let sec: SecuritySettings = DEFAULT;
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<SecuritySettings>;
      sec = { ...DEFAULT, ...parsed };
    } catch { /* fallback */ }
  }
  console.log(`[run-now] security: autoBan=${sec.autoBanEnabled} hitsPerHour=${sec.hitsPerHourThreshold} perPath=${sec.hitsPerPathPerHourThreshold} banHours=${sec.autoBanDurationHours}`);

  // ── 2) Auto-ban degli ultimi 7 giorni ──────────────────────
  let autoBanned = 0;
  if (sec.autoBanEnabled) {
    // Soglia settimanale = soglia oraria * 24 * 7 / conservative-factor (usiamo *24 per 1 giorno completo)
    const daysScan = 7;
    const dailyThreshold = sec.hitsPerHourThreshold * 12; // proxy: se >12h di attività sostenuta
    const dailyPathThreshold = sec.hitsPerPathPerHourThreshold * 12;
    const dateFrom = new Date(Date.now() - daysScan * 24 * 60 * 60 * 1000);
    const dateTo = new Date();

    const bombers = await prisma.$queryRawUnsafe<Array<{ ipHash: string; n: bigint }>>(
      `SELECT \`ipHash\`, COUNT(*) AS n FROM \`PageView\`
       WHERE \`createdAt\` >= ? AND \`createdAt\` <= ?
         AND \`ipHash\` IS NOT NULL
       GROUP BY \`ipHash\` HAVING n > ?`,
      dateFrom, dateTo, dailyThreshold
    );
    const scanners = await prisma.$queryRawUnsafe<Array<{ ipHash: string; path: string; n: bigint }>>(
      `SELECT \`ipHash\`, \`path\`, COUNT(*) AS n FROM \`PageView\`
       WHERE \`createdAt\` >= ? AND \`createdAt\` <= ?
         AND \`ipHash\` IS NOT NULL
       GROUP BY \`ipHash\`, \`path\` HAVING n > ?
       ORDER BY n DESC LIMIT 500`,
      dateFrom, dateTo, dailyPathThreshold
    );

    const expiresAt = sec.autoBanDurationHours > 0
      ? new Date(Date.now() + sec.autoBanDurationHours * 60 * 60 * 1000)
      : null;
    const toBan = new Map<string, string>();
    for (const b of bombers) {
      const n = Number(b.n);
      toBan.set(b.ipHash, `Auto: ${n} hit ultimi ${daysScan}gg (soglia ${dailyThreshold})`);
    }
    for (const s of scanners) {
      const n = Number(s.n);
      if (!toBan.has(s.ipHash)) {
        toBan.set(s.ipHash, `Auto: ${n} hit su path ${s.path.slice(0, 60)} (soglia ${dailyPathThreshold})`);
      }
    }
    for (const [ipHash, reason] of Array.from(toBan.entries())) {
      try {
        await prisma.blockedIp.upsert({
          where: { ipHash },
          create: { ipHash, reason, autoBanned: true, expiresAt },
          update: { reason, autoBanned: true, expiresAt, blockedAt: new Date() },
        });
        autoBanned++;
      } catch { /* race safe */ }
    }
  }
  console.log(`[run-now] auto-banned: ${autoBanned} IP`);

  // ── 3) Rigenera snapshot di oggi (SITO + STORE) ─────────────
  const today = new Date().toISOString().slice(0, 10);
  for (const host of ["SITO", "STORE"] as const) {
    const t1 = Date.now();
    const { inserted } = await snapshotDayHost(today, host, true);
    console.log(`[run-now] snapshot ${today} ${host}: +${inserted} righe (${((Date.now() - t1)/1000).toFixed(1)}s)`);
  }

  console.log(`[run-now] FATTO in ${((Date.now() - t0)/1000).toFixed(1)}s`);
}
main().catch((e) => { console.error("[run-now] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
