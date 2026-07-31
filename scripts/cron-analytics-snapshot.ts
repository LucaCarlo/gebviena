/**
 * Cron notturno: aggrega PageView del giorno in AnalyticsDaySnapshot.
 * Ottimizzato con TEMPORARY TABLE: 1 scan del giorno + N GROUP BY su tabella in RAM.
 * ~10x più veloce della v1 (5 min → 20s per giorno).
 *
 * Uso: npx tsx scripts/cron-analytics-snapshot.ts [--backfill=90] [--force]
 */
import { prisma } from "../src/lib/prisma";

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

const HOSTS = ["SITO", "STORE"] as const;
type Host = typeof HOSTS[number];

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

async function snapshotDayHost(day: string, host: Host, force = false): Promise<{ inserted: number; skipped: boolean }> {
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

  // Usa $transaction per garantire stessa connessione (temp table richiede session persistente).
  const inserted = await prisma.$transaction(async (tx) => {
    // 1) Crea temp table col subset del giorno per l'host.
    // IMPORTANTE: usiamo range esplicito su createdAt (UTC) invece di DATE(CONVERT_TZ(...))
    // così l'indice (host, createdAt) funziona a pieno. day è in tz italiano (+02:00).
    // day '2026-07-30' IT = createdAt UTC [2026-07-29T22:00:00, 2026-07-30T22:00:00).
    const startUtc = new Date(`${day}T00:00:00${TZ_SHIFT}`);
    const endUtc = new Date(`${day}T23:59:59.999${TZ_SHIFT}`);
    await tx.$executeRawUnsafe(
      `CREATE TEMPORARY TABLE tmp_pv AS
       SELECT ipHash, path, geoCountry, geoRegion, geoCity, userAgent, referrer
         FROM \`PageView\`
         WHERE host = ? AND createdAt >= ? AND createdAt <= ?`,
      host, startUtc, endUtc
    );
    // Index sulla temp table per velocizzare i COUNT DISTINCT
    await tx.$executeRawUnsafe(`CREATE INDEX tmp_pv_ip ON tmp_pv (ipHash(40))`).catch(() => {});

    let cnt = 0;
    // 2) Totale del giorno
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

    // 3) Per ogni dimensione, bulk INSERT con SELECT diretto
    for (const dim of DIMENSIONS) {
      // Recupera le righe aggregate
      const rows = await tx.$queryRawUnsafe<Array<{ v: string; hits: bigint; uniques: bigint }>>(
        `SELECT ${dim.select} AS v, COUNT(*) AS hits, COUNT(DISTINCT ipHash) AS uniques
           FROM tmp_pv GROUP BY v ORDER BY hits DESC LIMIT 200`
      );
      if (rows.length === 0) continue;
      // Bulk insert
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

    // 4) Drop temp table (auto drop a fine session comunque)
    await tx.$executeRawUnsafe(`DROP TEMPORARY TABLE IF EXISTS tmp_pv`);
    return cnt;
  }, { timeout: 120_000 }); // 2 min per giorno-host

  return { inserted, skipped: false };
}

async function main() {
  const args = process.argv.slice(2);
  const backfillArg = args.find((a) => a.startsWith("--backfill="));
  const backfillDays = backfillArg ? Math.max(1, Math.min(365, Number(backfillArg.split("=")[1]) || 1)) : 1;
  const force = args.includes("--force");

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const days: string[] = [];
  for (let i = 0; i < backfillDays; i++) {
    const d = new Date(yesterday.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }

  console.log(`[snapshot] giorni da processare: ${days.length} (${days[days.length - 1]} → ${days[0]}) force=${force}`);
  let totalInserted = 0;
  let totalSkipped = 0;
  const t0 = Date.now();
  for (const day of days) {
    for (const host of HOSTS) {
      const t1 = Date.now();
      try {
        const { inserted, skipped } = await snapshotDayHost(day, host, force);
        const ms = Date.now() - t1;
        if (skipped) { totalSkipped++; console.log(`[snapshot] ${day} ${host}: SKIP`); }
        else { totalInserted += inserted; console.log(`[snapshot] ${day} ${host}: +${inserted} righe (${(ms/1000).toFixed(1)}s)`); }
      } catch (e) {
        console.error(`[snapshot] ${day} ${host}: ERR ${(e as Error).message}`);
      }
    }
  }
  console.log(`[snapshot] FATTO. inserite=${totalInserted} saltati=${totalSkipped} totale=${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error("[snapshot] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
