/**
 * Geolocalizza le PageView: ricostruisce ipHash→IP dai log, GeoIP batch (ip-api),
 * aggiorna PageView per ipHash. Pensato per girare in background (nohup).
 */
import { prisma } from "../src/lib/prisma";
import { readFileSync, readdirSync } from "fs";
import { createHash } from "crypto";

const LOGDIR = "/home/gebruederthonetvienna-usr/logs/nginx";
const hash = (ip: string) => createHash("sha256").update(ip + "|gtv").digest("hex").slice(0, 40);

async function main() {
  // ipHash che servono (righe senza geo)
  const need = await prisma.$queryRawUnsafe<Array<{ ipHash: string }>>(
    "SELECT DISTINCT `ipHash` FROM `PageView` WHERE `geoCountry` IS NULL AND `ipHash` IS NOT NULL");
  const needSet = new Set(need.map((r) => r.ipHash));
  console.log(`[geo] ipHash da risolvere: ${needSet.size}`);

  // mappa ipHash -> IP raw dai log
  const ipByHash = new Map<string, string>();
  const ipRe = /^(\S+) - - \[/;
  for (const f of readdirSync(LOGDIR)) {
    if (!/^(access|store-access)\.log/.test(f)) continue;
    let txt = ""; try { txt = readFileSync(`${LOGDIR}/${f}`, "utf8"); } catch { continue; }
    for (const ln of txt.split("\n")) {
      const m = ln.match(ipRe); if (!m) continue;
      const ip = m[1]; const h = hash(ip);
      if (needSet.has(h) && !ipByHash.has(h)) ipByHash.set(h, ip);
    }
  }
  console.log(`[geo] IP risolti dai log: ${ipByHash.size}/${needSet.size}`);

  const pairs = Array.from(ipByHash.entries()); // [hash, ip]
  let done = 0, geoOk = 0;
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
        const g = byIp.get(ip);
        if (!g) continue;
        await prisma.$executeRawUnsafe(
          "UPDATE `PageView` SET `geoCity`=?,`geoRegion`=?,`geoCountry`=? WHERE `ipHash`=?",
          g.city || null, g.region || null, g.country || null, h);
        geoOk++;
      }
    } catch (e) { console.error("[geo] batch err:", (e as Error).message); }
    done += chunk.length;
    if ((i / 100) % 10 === 0) console.log(`[geo] progress ${done}/${pairs.length} (geoOk=${geoOk})`);
    if (i + 100 < pairs.length) await new Promise((r) => setTimeout(r, 4000));
  }
  const left = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>("SELECT COUNT(*) c FROM `PageView` WHERE `geoCountry` IS NULL");
  console.log(`[geo] FATTO. hash geo-ok=${geoOk}. PageView senza geo rimaste=${Number(left[0].c)}`);
}
main().catch((e) => { console.error("[geo] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
