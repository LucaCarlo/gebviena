import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostParam = (searchParams.get("host") || "").toUpperCase();
  const host = hostParam === "SITO" || hostParam === "STORE" ? hostParam : "";
  const rangeParam = (searchParams.get("range") || "all").toLowerCase();
  const RANGE_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "1y": 365 };
  const days = RANGE_DAYS[rangeParam]; // undefined => all
  const isHourly = rangeParam === "1d";

  const conds: string[] = [];
  if (host) conds.push(`\`host\` = '${host}'`);
  if (days) conds.push(`\`createdAt\` >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)`);
  const W = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  // condizione solo-data (per lo split sito/store, indipendente dal filtro host)
  const dateOnly = days ? `WHERE \`createdAt\` >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)` : "";

  const q = <T = Row>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
  const DAY = "DATE(CONVERT_TZ(`createdAt`,'+00:00','+02:00'))";
  const HOUR = "DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m-%d %H:00')";
  // grana "visita": stesso visitatore + stessa pagina + stesso minuto
  const DEDUP = "`ipHash`, `path`, DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m-%d %H:%i')";
  const BUCKET = isHourly ? HOUR : DAY;

  const PAGE = 30;
  const recentSql = (offset: number) =>
    `SELECT MAX(\`path\`) p, MAX(\`host\`) h, MAX(\`geoCity\`) c, MAX(\`geoCountry\`) co,
            MAX(\`referrer\`) r, MAX(\`createdAt\`) t, COUNT(*) hits
       FROM \`PageView\` ${W}
       GROUP BY ${DEDUP}
       ORDER BY t DESC LIMIT ${PAGE + 1} OFFSET ${offset}`;
  const mapRecent = (rows: Row[]) => rows.map((r) => ({
    path: String(r.p), host: String(r.h || ""),
    city: r.c ? String(r.c) : null, country: r.co ? String(r.co) : null,
    referrer: r.r ? String(r.r) : null, createdAt: r.t, hits: num(r.hits),
  }));

  if (searchParams.get("recentPage")) {
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const rec = await q(recentSql(offset));
    return NextResponse.json({ success: true, data: { recent: mapRecent(rec.slice(0, PAGE)), hasMore: rec.length > PAGE } });
  }

  const [viewsR, uniqueR, daysR, perHost, series, topPages, countries, regions, cities, sources, devices, recent] =
    await Promise.all([
      q(`SELECT COUNT(*) c FROM (SELECT 1 FROM \`PageView\` ${W} GROUP BY ${DEDUP}) z`),
      q(`SELECT COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${W}`),
      q(`SELECT COUNT(DISTINCT ${DAY}) d, MIN(${DAY}) mn, MAX(${DAY}) mx, COUNT(DISTINCT ${HOUR}) h FROM \`PageView\` ${W}`),
      q(`SELECT \`host\`, COUNT(*) v FROM \`PageView\` ${dateOnly} GROUP BY \`host\``),
      q(`SELECT b, COUNT(*) v FROM (SELECT MIN(${BUCKET}) b FROM \`PageView\` ${W} GROUP BY ${DEDUP}) t GROUP BY b ORDER BY b`),
      q(`SELECT p, COUNT(*) v FROM (SELECT \`path\` p FROM \`PageView\` ${W} GROUP BY ${DEDUP}) t GROUP BY p ORDER BY v DESC LIMIT 15`),
      q(`SELECT COALESCE(NULLIF(\`geoCountry\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
      q(`SELECT COALESCE(NULLIF(\`geoRegion\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
      q(`SELECT COALESCE(NULLIF(\`geoCity\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${W} GROUP BY n ORDER BY v DESC LIMIT 15`),
      q(`SELECT CASE
            WHEN \`referrer\` IS NULL OR \`referrer\`='' OR \`referrer\` LIKE '%gebruederthonetvienna.com%' THEN 'Diretto / interno'
            WHEN \`referrer\` LIKE '%facebook%' OR \`referrer\` LIKE '%fbclid%' OR \`referrer\` LIKE '%fb.%' THEN 'Facebook'
            WHEN \`referrer\` LIKE '%instagram%' OR \`referrer\` LIKE '%ig.%' THEN 'Instagram'
            WHEN \`referrer\` LIKE '%mailchi%' OR \`referrer\` LIKE '%list-manage%' OR \`referrer\` LIKE '%utm_medium=email%' OR \`referrer\` LIKE '%brid=%' THEN 'Email'
            WHEN \`referrer\` LIKE '%google%' THEN 'Google'
            WHEN \`referrer\` LIKE '%bing%' THEN 'Bing'
            WHEN \`referrer\` LIKE '%t.co%' OR \`referrer\` LIKE '%twitter%' OR \`referrer\` LIKE '%x.com%' THEN 'X / Twitter'
            ELSE 'Altro' END src, COUNT(*) v
          FROM \`PageView\` ${W} GROUP BY src ORDER BY v DESC`),
      q(`SELECT CASE
            WHEN \`userAgent\` LIKE '%Mobi%' OR \`userAgent\` LIKE '%Android%' OR \`userAgent\` LIKE '%iPhone%' THEN 'Mobile'
            WHEN \`userAgent\` LIKE '%iPad%' OR \`userAgent\` LIKE '%Tablet%' THEN 'Tablet'
            ELSE 'Desktop' END dev, COUNT(*) v
          FROM \`PageView\` ${W} GROUP BY dev ORDER BY v DESC`),
      q(recentSql(0)),
    ]);

  const views = num(viewsR[0]?.c);
  const unique = num(uniqueR[0]?.u);
  const periodDays = num(daysR[0]?.d) || 0;
  const periodHours = num(daysR[0]?.h) || 0;
  const avgDen = isHourly ? Math.max(1, periodHours) : Math.max(1, periodDays);
  const ph: Record<string, number> = {};
  for (const r of perHost) ph[String((r as Row).host || "?")] = num((r as Row).v);

  return NextResponse.json({
    success: true,
    data: {
      filterHost: host || "ALL",
      range: rangeParam,
      isHourly,
      kpi: {
        views,
        unique,
        avg: Math.round(views / avgDen),
        avgUnit: isHourly ? "ora" : "giorno",
        periodDays,
        minDate: daysR[0]?.mn || null,
        maxDate: daysR[0]?.mx || null,
        pagesPerUser: unique > 0 ? Math.round((views / unique) * 10) / 10 : 0,
        sito: ph["SITO"] || 0,
        store: ph["STORE"] || 0,
      },
      series: series.map((r) => ({ date: String((r as Row).b), views: num((r as Row).v) })),
      topPages: topPages.map((r) => ({ path: String((r as Row).p), count: num((r as Row).v) })),
      geo: {
        countries: countries.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        regions: regions.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        cities: cities.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
      },
      sources: sources.map((r) => ({ name: String((r as Row).src), count: num((r as Row).v) })),
      devices: devices.map((r) => ({ name: String((r as Row).dev), count: num((r as Row).v) })),
      recent: mapRecent(recent.slice(0, PAGE)),
      recentHasMore: recent.length > PAGE,
    },
  });
}
