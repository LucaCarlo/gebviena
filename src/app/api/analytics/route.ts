import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

// Cache in-memory dei risultati per ridurre il carico: 17 query parallele su
// 400k+ righe sono costose. Cache 60s per (host, range) e 30s per la pagina
// dei "recent". Si svuota al restart del processo.
type CacheEntry = { data: unknown; expires: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;       // 60s per i dati aggregati
const CACHE_TTL_RECENT_MS = 30_000; // 30s per la lista "recent" paginata

export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostParam = (searchParams.get("host") || "").toUpperCase();
  const host = hostParam === "SITO" || hostParam === "STORE" ? hostParam : "";
  const rangeParam = (searchParams.get("range") || "all").toLowerCase();

  // Chiave cache: include host + range + (eventuale pagina recent).
  const recentPageKey = searchParams.get("recentPage") ? `recent:${searchParams.get("offset") || "0"}` : "stats";
  const cacheKey = `${host || "ALL"}|${rangeParam}|${recentPageKey}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ success: true, data: cached.data, cached: true });
  }
  const RANGE_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "1y": 365 };
  const days = RANGE_DAYS[rangeParam];
  const isHourly = rangeParam === "1d";

  const conds: string[] = [];
  if (host) conds.push(`\`host\` = '${host}'`);
  if (days) conds.push(`\`createdAt\` >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)`);
  const W = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const q = <T = Row>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
  const DAY = "DATE(CONVERT_TZ(`createdAt`,'+00:00','+02:00'))";
  const HOUR = "DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m-%d %H:00')";
  const BUCKET = isHourly ? HOUR : DAY;
  const DEDUP = "`ipHash`, `path`, DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m-%d %H:%i')";

  const PAGE = 30;
  const recentSql = (offset: number) =>
    `SELECT MAX(\`path\`) p, MAX(\`host\`) h, MAX(\`geoCity\`) c, MAX(\`geoCountry\`) co,
            MAX(\`referrer\`) r, MAX(\`createdAt\`) t, COUNT(*) hits
       FROM \`PageView\` ${W} GROUP BY ${DEDUP} ORDER BY t DESC LIMIT ${PAGE + 1} OFFSET ${offset}`;
  const mapRecent = (rows: Row[]) => rows.map((r) => ({
    path: String(r.p), host: String(r.h || ""),
    city: r.c ? String(r.c) : null, country: r.co ? String(r.co) : null,
    referrer: r.r ? String(r.r) : null, createdAt: r.t, hits: num(r.hits),
  }));

  if (searchParams.get("recentPage")) {
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const rec = await q(recentSql(offset));
    const payload = { recent: mapRecent(rec.slice(0, PAGE)), hasMore: rec.length > PAGE };
    CACHE.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_RECENT_MS });
    return NextResponse.json({ success: true, data: payload });
  }

  const OS = `CASE
      WHEN \`userAgent\` LIKE '%iPhone%' THEN 'iPhone (iOS)'
      WHEN \`userAgent\` LIKE '%iPad%' THEN 'iPad (iOS)'
      WHEN \`userAgent\` LIKE '%Android%' THEN 'Android'
      WHEN \`userAgent\` LIKE '%Windows%' THEN 'Windows'
      WHEN \`userAgent\` LIKE '%Macintosh%' OR \`userAgent\` LIKE '%Mac OS%' THEN 'Mac'
      WHEN \`userAgent\` LIKE '%Linux%' OR \`userAgent\` LIKE '%CrOS%' THEN 'Linux/Chrome OS'
      ELSE 'Altro' END`;
  const DEV = `CASE
      WHEN \`userAgent\` LIKE '%iPad%' OR \`userAgent\` LIKE '%Tablet%' THEN 'Tablet'
      WHEN \`userAgent\` LIKE '%Mobi%' OR \`userAgent\` LIKE '%iPhone%' OR \`userAgent\` LIKE '%Android%' THEN 'Mobile'
      ELSE 'Desktop' END`;

  const isStore = host === "STORE";
  const SW = isStore ? W : "WHERE `host`='STORE'";

  const [
    uniqueR, avgTimeR, daysR, series, topPages, countries, regions, cities, sources, devices, osR, recent,
    sfV, sfP, sfC, sfK, sfOk, sfTop,
  ] = await Promise.all([
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${W}`),
    // tempo medio di permanenza per SESSIONE reale: nuova sessione dopo 30
    // min di inattività (come Google Analytics). Durata = ultima − prima
    // vista nella sessione, mediata su tutte le sessioni.
    q(`WITH seq AS (
          SELECT \`ipHash\` h, UNIX_TIMESTAMP(\`createdAt\`) ts,
                 LAG(UNIX_TIMESTAMP(\`createdAt\`)) OVER (PARTITION BY \`ipHash\` ORDER BY \`createdAt\`) prev
          FROM \`PageView\` ${W}
        ),
        flagged AS (SELECT h, ts, CASE WHEN prev IS NULL OR ts - prev > 1800 THEN 1 ELSE 0 END nw FROM seq),
        sess AS (SELECT h, ts, SUM(nw) OVER (PARTITION BY h ORDER BY ts) sid FROM flagged)
        SELECT AVG(d) a FROM (SELECT MAX(ts)-MIN(ts) d FROM sess GROUP BY h, sid) x`),
    q(`SELECT COUNT(DISTINCT ${DAY}) d, MIN(${DAY}) mn, MAX(${DAY}) mx, COUNT(DISTINCT ${HOUR}) h FROM \`PageView\` ${W}`),
    q(`SELECT ${BUCKET} b, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY b ORDER BY b`),
    q(`SELECT \`path\` p, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY \`path\` ORDER BY v DESC LIMIT 15`),
    q(`SELECT COALESCE(NULLIF(\`geoCountry\`,''),'(sconosciuto)') n, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
    q(`SELECT COALESCE(NULLIF(\`geoRegion\`,''),'(sconosciuto)') n, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
    q(`SELECT COALESCE(NULLIF(\`geoCity\`,''),'(sconosciuto)') n, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 15`),
    q(`SELECT CASE
          WHEN \`referrer\` IS NULL OR \`referrer\`='' OR \`referrer\` LIKE '%gebruederthonetvienna.com%' THEN 'Diretto / interno'
          WHEN \`referrer\` LIKE '%facebook%' OR \`referrer\` LIKE '%fbclid%' OR \`referrer\` LIKE '%fb.%' THEN 'Facebook'
          WHEN \`referrer\` LIKE '%instagram%' THEN 'Instagram'
          WHEN \`referrer\` LIKE '%mailchi%' OR \`referrer\` LIKE '%list-manage%' OR \`referrer\` LIKE '%utm_medium=email%' OR \`referrer\` LIKE '%brid=%' THEN 'Email'
          WHEN \`referrer\` LIKE '%google%' THEN 'Google'
          WHEN \`referrer\` LIKE '%bing%' THEN 'Bing'
          ELSE 'Altro' END src, COUNT(DISTINCT \`ipHash\`) v
        FROM \`PageView\` ${W} GROUP BY src ORDER BY v DESC`),
    q(`SELECT ${DEV} dev, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY dev ORDER BY v DESC`),
    q(`SELECT ${OS} os, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${W} GROUP BY os ORDER BY v DESC`),
    q(recentSql(0)),
    // ---- funnel STORE (sempre calcolato sul traffico STORE del periodo) ----
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${SW}`),
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${SW} AND \`path\` LIKE '%/prodotti/%'`),
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${SW} AND \`path\` LIKE '%carrello%'`),
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${SW} AND \`path\` LIKE '%checkout%' AND \`path\` NOT LIKE '%success%'`),
    q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${SW} AND \`path\` LIKE '%checkout/success%'`),
    q(`SELECT \`path\` p, COUNT(DISTINCT \`ipHash\`) v FROM \`PageView\` ${SW} AND \`path\` LIKE '%/prodotti/%' GROUP BY \`path\` ORDER BY v DESC LIMIT 15`),
  ]);

  const unique = num(uniqueR[0]?.u);
  const avgSeconds = Math.round(num(avgTimeR[0]?.a));
  const seriesArr = series.map((r) => ({ date: String((r as Row).b), views: num((r as Row).v) }));
  const avg = seriesArr.length ? Math.round(seriesArr.reduce((s, x) => s + x.views, 0) / seriesArr.length) : 0;
  const sv = num(sfV[0]?.u);
  const pct = (a: number) => (sv > 0 ? Math.round((a / sv) * 100) : 0);

  const payload = {
      filterHost: host || "ALL",
      range: rangeParam,
      isHourly,
      isStore,
      kpi: {
        unique,
        avgSeconds,
        avg,
        avgUnit: isHourly ? "ora" : "giorno",
        periodDays: num(daysR[0]?.d) || 0,
        minDate: daysR[0]?.mn || null,
        maxDate: daysR[0]?.mx || null,
      },
      series: seriesArr,
      topPages: topPages.map((r) => ({ path: String((r as Row).p), count: num((r as Row).v) })),
      geo: {
        countries: countries.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        regions: regions.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        cities: cities.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
      },
      sources: sources.map((r) => ({ name: String((r as Row).src), count: num((r as Row).v) })),
      devices: devices.map((r) => ({ name: String((r as Row).dev), count: num((r as Row).v) })),
      systems: osR.map((r) => ({ name: String((r as Row).os), count: num((r as Row).v) })),
      store: {
        funnel: [
          { name: "Visitatori store", count: sv, pct: 100 },
          { name: "Hanno visto un prodotto", count: num(sfP[0]?.u), pct: pct(num(sfP[0]?.u)) },
          { name: "Arrivati al carrello", count: num(sfC[0]?.u), pct: pct(num(sfC[0]?.u)) },
          { name: "Arrivati al checkout", count: num(sfK[0]?.u), pct: pct(num(sfK[0]?.u)) },
          { name: "Ordine completato", count: num(sfOk[0]?.u), pct: pct(num(sfOk[0]?.u)) },
        ],
        topProducts: sfTop.map((r) => ({
          path: String((r as Row).p).replace(/^\/(fr\/)?prodotti\//, ""),
          count: num((r as Row).v),
        })),
      },
      recent: mapRecent(recent.slice(0, PAGE)),
      recentHasMore: recent.length > PAGE,
  };
  CACHE.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ success: true, data: payload });
}
