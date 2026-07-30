import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

// Cache in-memory dei risultati per ridurre il carico. Si svuota al restart.
type CacheEntry = { data: unknown; expires: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300_000;        // 5min per dati aggregati (le metriche cambiano lentamente)
const CACHE_TTL_RECENT_MS = 30_000;  // 30s per recent paginato

/**
 * GET /api/analytics?host=SITO|STORE&range=1d|7d|30d|1y|all&section=X
 *
 * section può essere:
 *   - "kpi": visitatori unici, tempo medio, media, periodo, serie temporale
 *   - "pages": top pagine
 *   - "geo": countries, regions, cities
 *   - "sources": referrer aggregati
 *   - "devices": devices + sistemi operativi
 *   - "store": funnel store + top products
 *   - "recent": ultimi 30 eventi (paginabile via recentPage=1&offset=N)
 *   - (nessuna section) → ritorna TUTTO in un colpo (compat con vecchia chiamata)
 *
 * Frontend dovrebbe chiamare le sezioni in parallelo per rendering progressivo.
 */
export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostParam = (searchParams.get("host") || "").toUpperCase();
  const host = hostParam === "SITO" || hostParam === "STORE" ? hostParam : "";
  const rangeParam = (searchParams.get("range") || "all").toLowerCase();
  const section = (searchParams.get("section") || "").toLowerCase();
  const isRecentPage = !!searchParams.get("recentPage");

  // Cache key
  const cacheTag = isRecentPage ? `recent:${searchParams.get("offset") || "0"}` : (section || "all");
  const fromParam = (searchParams.get("from") || "").slice(0, 10); // YYYY-MM-DD
  const toParam   = (searchParams.get("to") || "").slice(0, 10);
  const cacheKey = `${host || "ALL"}|${rangeParam}|${fromParam}|${toParam}|${cacheTag}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ success: true, data: cached.data, cached: true });
  }

  const RANGE_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "1y": 365 };
  const days = RANGE_DAYS[rangeParam];

  // Range personalizzato: fromParam/toParam validati come YYYY-MM-DD.
  // Se rangeParam === "custom" ma le date sono invalide/mancanti, si comporta come "all".
  const isCustom = rangeParam === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam);
  const customDays = isCustom
    ? Math.max(1, Math.round((new Date(toParam + "T23:59:59Z").getTime() - new Date(fromParam + "T00:00:00Z").getTime()) / 86400000) + 1)
    : 0;

  const isHourly = rangeParam === "1d" || (isCustom && customDays <= 1);
  // Bucket mensile per range molto lunghi (grafico leggibile).
  const isMonthly = rangeParam === "1y" || rangeParam === "all" || (isCustom && customDays > 120);

  const conds: string[] = [];
  if (host) conds.push(`\`host\` = '${host}'`);
  if (isCustom) {
    conds.push(`\`createdAt\` >= '${fromParam} 00:00:00'`);
    conds.push(`\`createdAt\` <= '${toParam} 23:59:59'`);
  } else if (days) {
    conds.push(`\`createdAt\` >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)`);
  }
  const W = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  // Helper analytics fast-path per range Personalizzato:
  // COUNT(*) e' 60x piu' veloce di COUNT(DISTINCT ipHash) grazie al covering
  // index PageView_host_created_path_idx (host, createdAt, path).
  // Restituisce visualizzazioni totali (hits) invece di visitatori unici — metrica
  // comunque utile per confrontare pagine tra loro.
  const CNT = isCustom ? "COUNT(*)" : "COUNT(DISTINCT `ipHash`)";
  const FI  = isCustom ? "FORCE INDEX (PageView_host_created_path_idx)" : "";
  const PV  = `\`PageView\` ${FI}`.trim();

  const q = <T = Row>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
  const DAY = "DATE(CONVERT_TZ(`createdAt`,'+00:00','+02:00'))";
  const HOUR = "DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m-%d %H:00')";
  const MONTH = "DATE_FORMAT(CONVERT_TZ(`createdAt`,'+00:00','+02:00'),'%Y-%m')";
  const BUCKET = isHourly ? HOUR : (isMonthly ? MONTH : DAY);
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

  // --- RECENT paginato (richiamabile separatamente) ---
  if (isRecentPage) {
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

  // Helper per generare ogni sezione separatamente.
  // "kpi" = solo i 3 KPI VELOCI (visitatori, periodo, serie). NO tempo medio.
  async function buildKpi() {
    const [uniqueR, daysR, series] = await Promise.all([
      q(`SELECT ${CNT} u FROM ${PV} ${W}`),
      q(`SELECT COUNT(DISTINCT ${DAY}) d, MIN(${DAY}) mn, MAX(${DAY}) mx, COUNT(DISTINCT ${HOUR}) h FROM \`PageView\` ${W}`),
      q(`SELECT ${BUCKET} b, ${CNT} v FROM ${PV} ${W} GROUP BY b ORDER BY b`),
    ]);
    const seriesArr = series.map((r) => ({ date: String((r as Row).b), views: num((r as Row).v) }));
    const avg = seriesArr.length ? Math.round(seriesArr.reduce((s, x) => s + x.views, 0) / seriesArr.length) : 0;
    return {
      filterHost: host || "ALL",
      range: rangeParam,
      isHourly,
      isMonthly,
      isStore,
      kpi: {
        unique: num(uniqueR[0]?.u),
        avgSeconds: null,
        avg,
        avgUnit: isHourly ? "ora" : (isMonthly ? "mese" : "giorno"),
        periodDays: num(daysR[0]?.d) || 0,
        minDate: daysR[0]?.mn || null,
        maxDate: daysR[0]?.mx || null,
      },
      series: seriesArr,
    };
  }
  // Sezione "session-time" — calcolata via CTE LAG. Negli snapshot precalcolati
  // viene fatta dal cron notturno; qui è il fallback se non c'è snapshot.
  async function buildSessionTime() {
    // Skip su range personalizzati lunghi: la CTE con LAG e SUM window functions
    // e' O(N) e su 2.8M righe puo' impiegare 30s+. Torniamo null (il frontend mostra
    // placeholder "-" senza bloccare le altre sezioni).
    if (isCustom && customDays > 30) return { avgSeconds: null };
    const avgTimeR = await q(`WITH seq AS (
          SELECT \`ipHash\` h, UNIX_TIMESTAMP(\`createdAt\`) ts,
                 LAG(UNIX_TIMESTAMP(\`createdAt\`)) OVER (PARTITION BY \`ipHash\` ORDER BY \`createdAt\`) prev
          FROM \`PageView\` ${W}
        ),
        flagged AS (SELECT h, ts, CASE WHEN prev IS NULL OR ts - prev > 1800 THEN 1 ELSE 0 END nw FROM seq),
        sess AS (SELECT h, ts, SUM(nw) OVER (PARTITION BY h ORDER BY ts) sid FROM flagged)
        SELECT AVG(d) a FROM (SELECT MAX(ts)-MIN(ts) d FROM sess GROUP BY h, sid) x`);
    return { avgSeconds: Math.round(num(avgTimeR[0]?.a)) };
  }
  async function buildPages() {
    const topPages = await q(`SELECT \`path\` p, ${CNT} v FROM ${PV} ${W} GROUP BY \`path\` ORDER BY v DESC LIMIT 15`);
    return { topPages: topPages.map((r) => ({ path: String((r as Row).p), count: num((r as Row).v) })) };
  }
  async function buildGeo() {
    const [countries, regions, cities] = await Promise.all([
      q(`SELECT COALESCE(NULLIF(\`geoCountry\`,''),'(sconosciuto)') n, ${CNT} v FROM ${PV} ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
      q(`SELECT COALESCE(NULLIF(\`geoRegion\`,''),'(sconosciuto)') n, ${CNT} v FROM ${PV} ${W} GROUP BY n ORDER BY v DESC LIMIT 12`),
      q(`SELECT COALESCE(NULLIF(\`geoCity\`,''),'(sconosciuto)') n, ${CNT} v FROM ${PV} ${W} GROUP BY n ORDER BY v DESC LIMIT 15`),
    ]);
    return {
      geo: {
        countries: countries.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        regions: regions.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
        cities: cities.map((r) => ({ name: String((r as Row).n), count: num((r as Row).v) })),
      },
    };
  }
  async function buildSources() {
    const sources = await q(`SELECT CASE
          WHEN \`referrer\` IS NULL OR \`referrer\`='' OR \`referrer\` LIKE '%gebruederthonetvienna.com%' THEN 'Diretto / interno'
          WHEN \`referrer\` LIKE '%facebook%' OR \`referrer\` LIKE '%fbclid%' OR \`referrer\` LIKE '%fb.%' THEN 'Facebook'
          WHEN \`referrer\` LIKE '%instagram%' THEN 'Instagram'
          WHEN \`referrer\` LIKE '%mailchi%' OR \`referrer\` LIKE '%list-manage%' OR \`referrer\` LIKE '%utm_medium=email%' OR \`referrer\` LIKE '%brid=%' THEN 'Email'
          WHEN \`referrer\` LIKE '%google%' THEN 'Google'
          WHEN \`referrer\` LIKE '%bing%' THEN 'Bing'
          ELSE 'Altro' END src, ${CNT} v
        FROM ${PV} ${W} GROUP BY src ORDER BY v DESC`);
    return { sources: sources.map((r) => ({ name: String((r as Row).src), count: num((r as Row).v) })) };
  }
  async function buildDevices() {
    const [devices, osR] = await Promise.all([
      q(`SELECT ${DEV} dev, ${CNT} v FROM ${PV} ${W} GROUP BY dev ORDER BY v DESC`),
      q(`SELECT ${OS} os, ${CNT} v FROM ${PV} ${W} GROUP BY os ORDER BY v DESC`),
    ]);
    return {
      devices: devices.map((r) => ({ name: String((r as Row).dev), count: num((r as Row).v) })),
      systems: osR.map((r) => ({ name: String((r as Row).os), count: num((r as Row).v) })),
    };
  }
  async function buildStore() {
    const [sfV, sfP, sfC, sfK, sfOk, sfTop] = await Promise.all([
      q(`SELECT ${CNT} u FROM \`PageView\` ${SW}`),
      q(`SELECT ${CNT} u FROM \`PageView\` ${SW} AND \`path\` LIKE '%/prodotti/%'`),
      q(`SELECT ${CNT} u FROM \`PageView\` ${SW} AND \`path\` LIKE '%carrello%'`),
      q(`SELECT ${CNT} u FROM \`PageView\` ${SW} AND \`path\` LIKE '%checkout%' AND \`path\` NOT LIKE '%success%'`),
      q(`SELECT ${CNT} u FROM \`PageView\` ${SW} AND \`path\` LIKE '%checkout/success%'`),
      q(`SELECT \`path\` p, ${CNT} v FROM \`PageView\` ${SW} AND \`path\` LIKE '%/prodotti/%' GROUP BY \`path\` ORDER BY v DESC LIMIT 15`),
    ]);
    const sv = num(sfV[0]?.u);
    const pct = (a: number) => (sv > 0 ? Math.round((a / sv) * 100) : 0);
    return {
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
    };
  }
  async function buildRecent() {
    const recent = await q(recentSql(0));
    return {
      recent: mapRecent(recent.slice(0, PAGE)),
      recentHasMore: recent.length > PAGE,
    };
  }

  // Sezione singola
  if (section) {
    // STRATEGIA "snapshot DB":
    // Se il range non è "1d" (che cambia in tempo reale), prima cerchiamo
    // uno snapshot precalcolato dal cron notturno nella tabella
    // AnalyticsSnapshot. Se esiste e è recente, estraiamo la sezione richiesta.
    // Cosi' la pagina admin si carica istantaneamente.
    if (rangeParam !== "1d") {
      try {
        const snapKey = `${host || "ALL"}|${rangeParam}`;
        const snap = await prisma.analyticsSnapshot.findUnique({ where: { cacheKey: snapKey } });
        if (snap) {
          const full = JSON.parse(snap.data) as Record<string, unknown>;
          let extracted: unknown = null;
          switch (section) {
            case "kpi": extracted = {
              filterHost: full.filterHost, range: full.range,
              isHourly: full.isHourly, isMonthly: full.isMonthly, isStore: full.isStore,
              kpi: { ...(full.kpi as object), avgSeconds: null },
              series: full.series,
            }; break;
            case "session-time": extracted = { avgSeconds: (full.kpi as { avgSeconds?: number })?.avgSeconds ?? null }; break;
            case "pages": extracted = { topPages: full.topPages }; break;
            case "geo": extracted = { geo: full.geo }; break;
            case "sources": extracted = { sources: full.sources }; break;
            case "devices": extracted = { devices: full.devices, systems: full.systems }; break;
            case "store": extracted = { store: full.store }; break;
            case "recent": extracted = { recent: full.recent, recentHasMore: full.recentHasMore }; break;
          }
          if (extracted) {
            CACHE.set(cacheKey, { data: extracted, expires: Date.now() + CACHE_TTL_MS });
            return NextResponse.json({ success: true, data: extracted, source: "snapshot", generatedAt: snap.generatedAt });
          }
        }
      } catch { /* fallback al calcolo live */ }
    }

    // Niente snapshot disponibile o range=1d → calcola al volo
    let data: unknown;
    switch (section) {
      case "kpi":          data = await buildKpi(); break;
      case "session-time": data = await buildSessionTime(); break;
      case "pages":        data = await buildPages(); break;
      case "geo":          data = await buildGeo(); break;
      case "sources":      data = await buildSources(); break;
      case "devices":      data = await buildDevices(); break;
      case "store":        data = await buildStore(); break;
      case "recent":       data = await buildRecent(); break;
      default: return NextResponse.json({ success: false, error: "section sconosciuta" }, { status: 400 });
    }
    CACHE.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ success: true, data });
  }

  // Compatibilità: tutto in un colpo (vecchio comportamento)
  const [kpi, sessTime, pages, geo, sources, devices, store, recent] = await Promise.all([
    buildKpi(), buildSessionTime(), buildPages(), buildGeo(), buildSources(), buildDevices(), buildStore(), buildRecent(),
  ]);
  const mergedKpi = { ...kpi, kpi: { ...kpi.kpi, avgSeconds: sessTime.avgSeconds } };
  const payload = { ...mergedKpi, ...pages, ...geo, ...sources, ...devices, ...store, ...recent };
  CACHE.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ success: true, data: payload });
}
