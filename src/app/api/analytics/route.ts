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
  const where = host ? `WHERE \`host\` = '${host}'` : "";
  const andHost = host ? `AND \`host\` = '${host}'` : "";

  const q = <T = Row>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
  // giorno locale IT
  const DAY = "DATE(CONVERT_TZ(`createdAt`,'+00:00','+02:00'))";

  // Visite recenti DEDUPLICATE: una riga per (visitatore, pagina, minuto),
  // con conteggio hit. Niente 10 righe identiche per la stessa visita.
  const PAGE = 30;
  const recentSql = (offset: number) =>
    `SELECT MAX(\`path\`) p, MAX(\`host\`) h, MAX(\`geoCity\`) c, MAX(\`geoCountry\`) co,
            MAX(\`referrer\`) r, MAX(\`createdAt\`) t, COUNT(*) hits
       FROM \`PageView\` ${where}
       GROUP BY \`ipHash\`, \`path\`, DATE_FORMAT(CONVERT_TZ(\`createdAt\`,'+00:00','+02:00'),'%Y-%m-%d %H:%i')
       ORDER BY t DESC LIMIT ${PAGE + 1} OFFSET ${offset}`;
  const mapRecent = (rows: Row[]) => rows.map((r) => ({
    path: String(r.p), host: String(r.h || ""),
    city: r.c ? String(r.c) : null, country: r.co ? String(r.co) : null,
    referrer: r.r ? String(r.r) : null, createdAt: r.t, hits: num(r.hits),
  }));

  // Modalità paginazione "Prosegui": ritorna solo la pagina recenti.
  if (searchParams.get("recentPage")) {
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const rec = await q(recentSql(offset));
    const hasMore = rec.length > PAGE;
    return NextResponse.json({ success: true, data: { recent: mapRecent(rec.slice(0, PAGE)), hasMore } });
  }

  const [
    totals, perHost, today, series, topPages, countries, regions, cities, sources, devices, recent, minDate,
  ] = await Promise.all([
    q(`SELECT COUNT(*) v, COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${where}`),
    q("SELECT `host`, COUNT(*) v FROM `PageView` GROUP BY `host`"),
    q(`SELECT COUNT(*) v FROM \`PageView\` WHERE ${DAY}=CURDATE() ${andHost}`),
    q(`SELECT ${DAY} d, COUNT(*) v, COUNT(DISTINCT \`ipHash\`) u FROM \`PageView\` ${where} GROUP BY d ORDER BY d`),
    q(`SELECT \`path\` p, COUNT(*) v FROM \`PageView\` ${where} GROUP BY \`path\` ORDER BY v DESC LIMIT 15`),
    q(`SELECT COALESCE(NULLIF(\`geoCountry\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${where} GROUP BY n ORDER BY v DESC LIMIT 12`),
    q(`SELECT COALESCE(NULLIF(\`geoRegion\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${where} GROUP BY n ORDER BY v DESC LIMIT 12`),
    q(`SELECT COALESCE(NULLIF(\`geoCity\`,''),'(sconosciuto)') n, COUNT(*) v FROM \`PageView\` ${where} GROUP BY n ORDER BY v DESC LIMIT 15`),
    q(`SELECT CASE
          WHEN \`referrer\` IS NULL OR \`referrer\`='' OR \`referrer\` LIKE '%gebruederthonetvienna.com%' THEN 'Diretto / interno'
          WHEN \`referrer\` LIKE '%facebook%' OR \`referrer\` LIKE '%fbclid%' OR \`referrer\` LIKE '%fb.%' THEN 'Facebook'
          WHEN \`referrer\` LIKE '%instagram%' OR \`referrer\` LIKE '%ig.%' THEN 'Instagram'
          WHEN \`referrer\` LIKE '%mailchi%' OR \`referrer\` LIKE '%list-manage%' OR \`referrer\` LIKE '%utm_medium=email%' OR \`referrer\` LIKE '%brid=%' THEN 'Email'
          WHEN \`referrer\` LIKE '%google%' THEN 'Google'
          WHEN \`referrer\` LIKE '%bing%' THEN 'Bing'
          WHEN \`referrer\` LIKE '%t.co%' OR \`referrer\` LIKE '%twitter%' OR \`referrer\` LIKE '%x.com%' THEN 'X / Twitter'
          ELSE 'Altro' END src, COUNT(*) v
        FROM \`PageView\` ${where} GROUP BY src ORDER BY v DESC`),
    q(`SELECT CASE
          WHEN \`userAgent\` LIKE '%Mobi%' OR \`userAgent\` LIKE '%Android%' OR \`userAgent\` LIKE '%iPhone%' THEN 'Mobile'
          WHEN \`userAgent\` LIKE '%iPad%' OR \`userAgent\` LIKE '%Tablet%' THEN 'Tablet'
          ELSE 'Desktop' END dev, COUNT(*) v
        FROM \`PageView\` ${where} GROUP BY dev ORDER BY v DESC`),
    q(recentSql(0)),
    q("SELECT MIN(`createdAt`) m FROM `PageView`"),
  ]);

  const total = num(totals[0]?.v);
  const unique = num(totals[0]?.u);
  const seriesArr = series.map((r) => ({ date: String((r as Row).d), views: num((r as Row).v), uniques: num((r as Row).u) }));
  const days = seriesArr.length || 1;
  const ph: Record<string, number> = {};
  for (const r of perHost) ph[String((r as Row).host || "?")] = num((r as Row).v);

  return NextResponse.json({
    success: true,
    data: {
      filterHost: host || "ALL",
      kpi: {
        total, unique,
        today: num(today[0]?.v),
        days,
        avgDay: Math.round(total / days),
        sito: ph["SITO"] || 0,
        store: ph["STORE"] || 0,
        since: minDate[0]?.m || null,
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
      recent: mapRecent(recent.slice(0, PAGE)),
      recentHasMore: recent.length > PAGE,
    },
  });
}
