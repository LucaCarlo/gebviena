/**
 * Recupera lo storico traffico (sito + store) dai log nginx → tabella PageView.
 * Solo pagine reali (no asset/api/bot). path prefissato [SITO]/[STORE].
 * PageView era vuota → la svuoto e reinserisco (recupero pulito, idempotente).
 */
import { prisma } from "../src/lib/prisma";
import { readFileSync, readdirSync } from "fs";
import { createHash } from "crypto";

const LOGDIR = "/home/gebruederthonetvienna-usr/logs/nginx";
const M: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
function ts(s: string): number {
  const m = s.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!m) return NaN;
  const off = (m[7][0] === "-" ? -1 : 1) * (+m[7].slice(1,3)*60 + +m[7].slice(3,5)) * 60000;
  return Date.UTC(+m[3], M[m[2]], +m[1], +m[4], +m[5], +m[6]) - off;
}
const LINE = /^(\S+) - - \[([^\]]+)\] "(\S+) ([^"]*?) HTTP\/[\d.]+" (\d{3}) \d+ "([^"]*)" "([^"]*)"/;
const ASSET = /\.(js|css|png|jpe?g|webp|svg|ico|gif|woff2?|ttf|map|json|xml|txt|mp4|webm|avif)(\?|$)|^\/_next\/|^\/api\/|\/uploads\/|favicon|robots\.txt|sitemap|\/_vercel|\.well-known/i;
const BOT = /bot|crawl|spider|slurp|headless|python|curl|wget|monitor|uptime|preview|facebookexternalhit|bingpreview|ahrefs|semrush|petalbot|dataprovider|dotbot|mj12|gptbot|claudebot|bytespider/i;

function rows(file: string, host: "SITO" | "STORE") {
  let txt = "";
  try { txt = readFileSync(`${LOGDIR}/${file}`, "utf8"); } catch { return []; }
  const out: Array<{ path: string; referrer: string | null; userAgent: string; ipHash: string; createdAt: Date }> = [];
  for (const ln of txt.split("\n")) {
    const m = ln.match(LINE);
    if (!m) continue;
    const [, ip, tstr, method, url, status, ref, ua] = m;
    if (method !== "GET") continue;
    if (status !== "200" && status !== "304") continue;
    const pathOnly = (url.split("?")[0] || "/").slice(0, 180);
    if (ASSET.test(url)) continue;
    if (BOT.test(ua)) continue;
    const t = ts(tstr);
    if (isNaN(t)) continue;
    out.push({
      path: `[${host}] ${pathOnly}`.slice(0, 191),
      referrer: ref && ref !== "-" ? ref.slice(0, 1000) : null,
      userAgent: ua.slice(0, 500),
      ipHash: createHash("sha256").update(ip + "|gtv").digest("hex").slice(0, 40),
      createdAt: new Date(t),
    });
  }
  return out;
}

async function main() {
  const files = readdirSync(LOGDIR);
  const all: ReturnType<typeof rows> = [];
  for (const f of files) {
    if (/^access\.log/.test(f)) all.push(...rows(f, "SITO"));
    else if (/^store-access\.log/.test(f)) all.push(...rows(f, "STORE"));
  }
  console.log(`Pagine reali estratte: ${all.length} (sito+store)`);
  const before = await prisma.pageView.count();
  if (before > 0) { await prisma.$executeRawUnsafe("TRUNCATE TABLE `PageView`"); console.log(`PageView svuotata (aveva ${before} righe)`); }

  let ins = 0;
  for (let i = 0; i < all.length; i += 2000) {
    const chunk = all.slice(i, i + 2000);
    await prisma.pageView.createMany({ data: chunk });
    ins += chunk.length;
  }
  console.log(`✓ Inserite ${ins} PageView`);
  const tot = await prisma.pageView.count();
  const sito = await prisma.pageView.count({ where: { path: { startsWith: "[SITO]" } } });
  const store = await prisma.pageView.count({ where: { path: { startsWith: "[STORE]" } } });
  console.log(`Totale PageView=${tot}  SITO=${sito}  STORE=${store}`);
}
main().catch((e) => { console.error("ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
