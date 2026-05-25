/**
 * Ingest "live" dei log nginx del GIORNO CORRENTE (file access.log / store-access.log
 * non ancora rotati).
 *
 * Idempotente tramite Setting `analytics_ingest_today_until_ts` (timestamp unix
 * dell'ultimo record di oggi già importato). Inserisce solo righe più recenti.
 *
 * Pensato per girare ogni N minuti via cron, così la pagina Analytics mostra
 * dati "fino a 10 min fa" anche per il giorno in corso senza aspettare la
 * rotazione di mezzanotte.
 */
import { prisma } from "../src/lib/prisma";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

const LOGDIR = "/home/gebruederthonetvienna-usr/logs/nginx";
const MON: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
const hash = (ip: string) => createHash("sha256").update(ip + "|gtv").digest("hex").slice(0, 40);
const LINE = /^(\S+) - - \[([^\]]+)\] "(\S+) ([^"]*?) HTTP\/[\d.]+" (\d{3}) \d+ "([^"]*)" "([^"]*)"/;
const ASSET = /\.(js|css|png|jpe?g|webp|svg|ico|gif|woff2?|ttf|map|json|xml|txt|mp4|webm|avif)(\?|$)|^\/_next\/|^\/api\/|\/uploads\/|favicon|robots\.txt|sitemap|\/_vercel|\.well-known/i;
const BOT = /bot|crawl|spider|slurp|headless|python|curl|wget|monitor|uptime|preview|facebookexternalhit|bingpreview|ahrefs|semrush|petalbot|dataprovider|dotbot|mj12|gptbot|claudebot|bytespider/i;

function tsOf(s: string): number {
  const m = s.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!m) return NaN;
  const off = (m[7][0] === "-" ? -1 : 1) * (+m[7].slice(1, 3) * 60 + +m[7].slice(3, 5)) * 60000;
  return Date.UTC(+m[3], MON[m[2]], +m[1], +m[4], +m[5], +m[6]) - off;
}

async function main() {
  // Soglia: l'ultimo timestamp ms già importato per oggi. Default = mezzanotte UTC
  // di oggi (così al primo run di oggi importa tutto da inizio giornata).
  const setting = await prisma.setting.findUnique({ where: { key: "analytics_ingest_today_until_ts" } });
  const todayStartUtc = new Date(); todayStartUtc.setUTCHours(0, 0, 0, 0);
  const lastTs = setting?.value ? parseInt(setting.value, 10) : todayStartUtc.getTime();
  // Se il setting è di un giorno precedente (passa mezzanotte), riparti da inizio oggi
  const cutoffTs = Math.max(lastTs, todayStartUtc.getTime());

  const files: Array<{ file: string; host: "SITO" | "STORE" }> = [
    { file: `${LOGDIR}/access.log`, host: "SITO" },
    { file: `${LOGDIR}/store-access.log`, host: "STORE" },
  ];

  const rows: Array<{ path: string; host: string; referrer: string | null; userAgent: string; ipHash: string; createdAt: Date }> = [];
  const ipByHash = new Map<string, string>();
  let maxTs = cutoffTs;

  for (const { file, host } of files) {
    if (!existsSync(file)) continue;
    let txt = "";
    try { txt = readFileSync(file, "utf8"); } catch { continue; }
    for (const ln of txt.split("\n")) {
      const mm = ln.match(LINE); if (!mm) continue;
      const [, ip, tstr, method, url, status, ref, ua] = mm;
      if (method !== "GET" || (status !== "200" && status !== "304")) continue;
      if (ASSET.test(url) || BOT.test(ua)) continue;
      const t = tsOf(tstr); if (isNaN(t)) continue;
      if (t <= cutoffTs) continue; // già importato o precedente al cutoff
      if (t > maxTs) maxTs = t;
      const h = hash(ip);
      if (!ipByHash.has(h)) ipByHash.set(h, ip);
      rows.push({
        path: (url.split("?")[0] || "/").slice(0, 180),
        host, referrer: ref && ref !== "-" ? ref.slice(0, 1000) : null,
        userAgent: ua.slice(0, 500), ipHash: h, createdAt: new Date(t),
      });
    }
  }

  if (!rows.length) {
    console.log(`[cron-traffic-today] nulla di nuovo (cutoff=${new Date(cutoffTs).toISOString()})`);
    return;
  }
  console.log(`[cron-traffic-today] da inserire=${rows.length} cutoff=${new Date(cutoffTs).toISOString()} maxTs=${new Date(maxTs).toISOString()}`);

  for (let i = 0; i < rows.length; i += 2000) {
    await prisma.pageView.createMany({ data: rows.slice(i, i + 2000) });
  }

  // Geolocalizzazione opzionale (ip-api.com batch). Limitata per non bloccare.
  const pairs = Array.from(ipByHash.entries()).slice(0, 100);
  let geoOk = 0;
  if (pairs.length) {
    try {
      const r = await fetch("http://ip-api.com/batch?fields=status,country,regionName,city,query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pairs.map(([, ip]) => ip)),
      });
      const arr = await r.json();
      const byIp = new Map<string, { city: string; region: string; country: string }>();
      for (const g of arr) if (g.status === "success") byIp.set(g.query, { city: g.city || "", region: g.regionName || "", country: g.country || "" });
      for (const [h, ip] of pairs) {
        const g = byIp.get(ip); if (!g) continue;
        await prisma.$executeRawUnsafe(
          "UPDATE `PageView` SET `geoCity`=?,`geoRegion`=?,`geoCountry`=? WHERE `ipHash`=? AND `geoCountry` IS NULL",
          g.city || null, g.region || null, g.country || null, h);
        geoOk++;
      }
    } catch (e) { console.error("[cron-traffic-today] geo err:", (e as Error).message); }
  }

  await prisma.setting.upsert({
    where: { key: "analytics_ingest_today_until_ts" },
    update: { value: String(maxTs) },
    create: { key: "analytics_ingest_today_until_ts", value: String(maxTs), group: "analytics" },
  });
  console.log(`[cron-traffic-today] FATTO. inseriti=${rows.length} geoOk=${geoOk}`);
}
main().catch((e) => { console.error("[cron-traffic-today] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
