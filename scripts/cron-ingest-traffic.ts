/**
 * Cron giornaliero: ingerisce i log nginx (sito+store) dei giorni rotati non
 * ancora importati nella tabella PageView e geolocalizza i nuovi IP.
 * Idempotente tramite Setting `analytics_ingest_until` (ultima data importata).
 * Eseguire una volta al giorno.
 */
import { prisma } from "../src/lib/prisma";
import { readFileSync, readdirSync } from "fs";
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
  const setting = await prisma.setting.findUnique({ where: { key: "analytics_ingest_until" } });
  const until = setting?.value || "2026-05-18"; // recupero iniziale copre fino al 18/05
  const today = new Date().toISOString().slice(0, 10);

  // File datati da processare: data > until e data <= oggi.
  // Nota sulla convention nginx: il file `access.log-YYYY-MM-DD` viene creato
  // dalla rotazione di logrotate alle 00:0X di YYYY-MM-DD e contiene i log del
  // giorno PRECEDENTE. Quindi per processare i log di "ieri" dobbiamo includere
  // il file con data = oggi (`<= today`, non `< today`).
  const files = readdirSync(LOGDIR);
  const todo: Array<{ file: string; host: "SITO" | "STORE"; date: string }> = [];
  for (const f of files) {
    let m = f.match(/^access\.log-(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] > until && m[1] <= today) { todo.push({ file: f, host: "SITO", date: m[1] }); continue; }
    m = f.match(/^store-access\.log-(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] > until && m[1] <= today) todo.push({ file: f, host: "STORE", date: m[1] });
  }
  if (!todo.length) { console.log(`[cron-traffic] nulla da fare (until=${until})`); return; }

  const rows: Array<{ path: string; host: string; referrer: string | null; userAgent: string; ipHash: string; createdAt: Date }> = [];
  const ipByHash = new Map<string, string>();
  let maxDate = until;
  for (const { file, host, date } of todo) {
    if (date > maxDate) maxDate = date;
    let txt = ""; try { txt = readFileSync(`${LOGDIR}/${file}`, "utf8"); } catch { continue; }
    for (const ln of txt.split("\n")) {
      const mm = ln.match(LINE); if (!mm) continue;
      const [, ip, tstr, method, url, status, ref, ua] = mm;
      if (method !== "GET" || (status !== "200" && status !== "304")) continue;
      if (ASSET.test(url) || BOT.test(ua)) continue;
      const t = tsOf(tstr); if (isNaN(t)) continue;
      const h = hash(ip);
      if (!ipByHash.has(h)) ipByHash.set(h, ip);
      rows.push({
        path: (url.split("?")[0] || "/").slice(0, 180),
        host, referrer: ref && ref !== "-" ? ref.slice(0, 1000) : null,
        userAgent: ua.slice(0, 500), ipHash: h, createdAt: new Date(t),
      });
    }
  }
  console.log(`[cron-traffic] giorni=${Array.from(new Set(todo.map((t) => t.date))).join(",")} pageview=${rows.length}`);

  for (let i = 0; i < rows.length; i += 2000) {
    await prisma.pageView.createMany({ data: rows.slice(i, i + 2000) });
  }

  // geolocalizza i nuovi ipHash senza geo
  const pairs = Array.from(ipByHash.entries());
  let geoOk = 0;
  for (let i = 0; i < pairs.length; i += 100) {
    const chunk = pairs.slice(i, i + 100);
    try {
      const r = await fetch("http://ip-api.com/batch?fields=status,country,regionName,city,query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map(([, ip]) => ip)),
      });
      const arr = await r.json();
      const byIp = new Map<string, { city: string; region: string; country: string }>();
      for (const g of arr) if (g.status === "success") byIp.set(g.query, { city: g.city || "", region: g.regionName || "", country: g.country || "" });
      for (const [h, ip] of chunk) {
        const g = byIp.get(ip); if (!g) continue;
        await prisma.$executeRawUnsafe(
          "UPDATE `PageView` SET `geoCity`=?,`geoRegion`=?,`geoCountry`=? WHERE `ipHash`=? AND `geoCountry` IS NULL",
          g.city || null, g.region || null, g.country || null, h);
        geoOk++;
      }
    } catch (e) { console.error("[cron-traffic] geo err:", (e as Error).message); }
    if (i + 100 < pairs.length) await new Promise((res) => setTimeout(res, 4000));
  }

  await prisma.setting.upsert({
    where: { key: "analytics_ingest_until" },
    update: { value: maxDate },
    create: { key: "analytics_ingest_until", value: maxDate, group: "analytics" },
  });
  console.log(`[cron-traffic] FATTO. inseriti=${rows.length} geoOk=${geoOk} until=${maxDate}`);
}
main().catch((e) => { console.error("[cron-traffic] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
