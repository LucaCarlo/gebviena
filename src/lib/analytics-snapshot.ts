/**
 * Libreria snapshot analytics: aggrega PageView di un (day, host) in
 * AnalyticsDaySnapshot. Usato sia dal cron notturno sia dall'API on-the-fly
 * per il giorno corrente.
 */
import { prisma } from "./prisma";

const TZ_SHIFT = "+02:00";

const OS_CASE = `CASE
  WHEN userAgent LIKE '%iPhone%' THEN 'iPhone (iOS)'
  WHEN userAgent LIKE '%iPad%' THEN 'iPad (iOS)'
  WHEN userAgent LIKE '%Android%' THEN 'Android'
  WHEN userAgent LIKE '%Windows%' THEN 'Windows'
  WHEN userAgent LIKE '%Macintosh%' OR userAgent LIKE '%Mac OS%' THEN 'Mac'
  WHEN userAgent LIKE '%Linux%' OR userAgent LIKE '%CrOS%' THEN 'Linux/Chrome OS'
  ELSE 'Altro' END`;
const DEV_CASE = `CASE
  WHEN userAgent LIKE '%iPad%' OR userAgent LIKE '%Tablet%' THEN 'Tablet'
  WHEN userAgent LIKE '%Mobi%' OR userAgent LIKE '%iPhone%' OR userAgent LIKE '%Android%' THEN 'Mobile'
  ELSE 'Desktop' END`;
const SRC_CASE = `CASE
  WHEN referrer IS NULL OR referrer = '' THEN 'Diretto'
  WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fbclid%' OR referrer LIKE '%fb.%' THEN 'Facebook'
  WHEN referrer LIKE '%instagram%' THEN 'Instagram'
  WHEN referrer LIKE '%mailchi%' OR referrer LIKE '%list-manage%' OR referrer LIKE '%utm_medium=email%' OR referrer LIKE '%brid=%' THEN 'Email'
  WHEN referrer LIKE '%google%' THEN 'Google'
  WHEN referrer LIKE '%bing%' THEN 'Bing'
  ELSE 'Altro' END`;

export const SNAPSHOT_HOSTS = ["SITO", "STORE"] as const;
export type SnapshotHost = typeof SNAPSHOT_HOSTS[number];

const DIMENSIONS: Array<{ kind: string; select: string }> = [
  { kind: "path",    select: "path" },
  { kind: "country", select: `COALESCE(NULLIF(geoCountry, ''), '(sconosciuto)')` },
  { kind: "region",  select: `COALESCE(NULLIF(geoRegion, ''), '(sconosciuto)')` },
  { kind: "city",    select: `COALESCE(NULLIF(geoCity, ''), '(sconosciuto)')` },
  { kind: "device",  select: DEV_CASE },
  { kind: "os",      select: OS_CASE },
  { kind: "source",  select: SRC_CASE },
];

function cuid(): string {
  return "s" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-8);
}

export async function snapshotDayHost(
  day: string,
  host: SnapshotHost,
  force = false
): Promise<{ inserted: number; skipped: boolean }> {
  if (!force) {
    const existing = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM \`AnalyticsDaySnapshot\` WHERE \`day\` = ? AND \`host\` = ?`,
      day, host
    );
    if (Number(existing[0]?.n ?? 0) > 0) return { inserted: 0, skipped: true };
  } else {
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`AnalyticsDaySnapshot\` WHERE \`day\` = ? AND \`host\` = ?`,
      day, host
    );
  }

  const inserted = await prisma.$transaction(async (tx) => {
    const startUtc = new Date(`${day}T00:00:00${TZ_SHIFT}`);
    const endUtc = new Date(`${day}T23:59:59.999${TZ_SHIFT}`);
    await tx.$executeRawUnsafe(
      `CREATE TEMPORARY TABLE tmp_pv AS
       SELECT ipHash, path, geoCountry, geoRegion, geoCity, userAgent, referrer
         FROM \`PageView\`
         WHERE host = ? AND createdAt >= ? AND createdAt <= ?`,
      host, startUtc, endUtc
    );
    await tx.$executeRawUnsafe(`CREATE INDEX tmp_pv_ip ON tmp_pv (ipHash(40))`).catch(() => {});

    let cnt = 0;
    const [totRow] = await tx.$queryRawUnsafe<Array<{ hits: bigint; uniques: bigint }>>(
      `SELECT COUNT(*) AS hits, COUNT(DISTINCT ipHash) AS uniques FROM tmp_pv`
    );
    if (totRow) {
      await tx.$executeRawUnsafe(
        `INSERT INTO \`AnalyticsDaySnapshot\` (id, day, host, dimensionKind, dimensionValue, hits, uniques)
           VALUES (?, ?, ?, 'total', '', ?, ?)`,
        cuid(), day, host, Number(totRow.hits ?? 0), Number(totRow.uniques ?? 0)
      );
      cnt++;
    }

    for (const dim of DIMENSIONS) {
      const rows = await tx.$queryRawUnsafe<Array<{ v: string; hits: bigint; uniques: bigint }>>(
        `SELECT ${dim.select} AS v, COUNT(*) AS hits, COUNT(DISTINCT ipHash) AS uniques
           FROM tmp_pv GROUP BY v ORDER BY hits DESC LIMIT 200`
      );
      if (rows.length === 0) continue;
      const values: string[] = [];
      const params: Array<string | number> = [];
      for (const r of rows) {
        const val = String(r.v ?? "").slice(0, 191);
        values.push("(?,?,?,?,?,?,?)");
        params.push(cuid(), day, host, dim.kind, val, Number(r.hits ?? 0), Number(r.uniques ?? 0));
      }
      const sql = `INSERT INTO \`AnalyticsDaySnapshot\`
        (id, day, host, dimensionKind, dimensionValue, hits, uniques) VALUES ${values.join(",")}`;
      await tx.$executeRawUnsafe(sql, ...params);
      cnt += rows.length;
    }

    await tx.$executeRawUnsafe(`DROP TEMPORARY TABLE IF EXISTS tmp_pv`);
    return cnt;
  }, { timeout: 120_000 });

  return { inserted, skipped: false };
}

// ─── Cache in-memory per snapshot on-the-fly di oggi ────────────────
// Ricalcola snapshot di "today" al massimo ogni 5 minuti (evita di rifarlo
// per ogni request analytics). La stale-lease semplice basta.
const todayLease = new Map<string, number>(); // key `${day}|${host}` -> expiresAt ms

export async function ensureTodaySnapshot(day: string, host: SnapshotHost): Promise<void> {
  const key = `${day}|${host}`;
  const now = Date.now();
  const exp = todayLease.get(key) || 0;
  if (exp > now) return; // già rigenerato di recente
  todayLease.set(key, now + 5 * 60 * 1000); // 5 min TTL
  // force=true perché per today vogliamo dati aggiornati (non skip)
  await snapshotDayHost(day, host, true).catch((e) => {
    console.error(`[snapshot] ensureTodaySnapshot ${key} err:`, e);
    todayLease.delete(key); // riprova al prossimo giro
  });
}
