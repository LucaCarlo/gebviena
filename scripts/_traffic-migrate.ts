/** ALTER idempotente PageView (host, geo*) + backfill host + strip prefisso path. */
import { prisma } from "../src/lib/prisma";

async function has(col: string) {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PageView' AND COLUMN_NAME=?`, col);
  return Number(r[0]?.c || 0) > 0;
}
async function idx(name: string) {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PageView' AND INDEX_NAME=?`, name);
  return Number(r[0]?.c || 0) > 0;
}

async function main() {
  const cols: Array<[string, string]> = [
    ["host", "VARCHAR(8) NULL"],
    ["geoCity", "VARCHAR(120) NULL"],
    ["geoRegion", "VARCHAR(120) NULL"],
    ["geoCountry", "VARCHAR(80) NULL"],
  ];
  for (const [n, t] of cols) {
    if (await has(n)) console.log(`✓ ${n} ok`);
    else { await prisma.$executeRawUnsafe(`ALTER TABLE \`PageView\` ADD COLUMN \`${n}\` ${t}`); console.log(`+ ${n}`); }
  }
  if (!(await idx("PageView_host_idx"))) { await prisma.$executeRawUnsafe("CREATE INDEX `PageView_host_idx` ON `PageView`(`host`)"); console.log("+ idx host"); }
  if (!(await idx("PageView_ipHash_idx"))) { await prisma.$executeRawUnsafe("CREATE INDEX `PageView_ipHash_idx` ON `PageView`(`ipHash`(40))"); console.log("+ idx ipHash"); }

  const s1 = await prisma.$executeRawUnsafe("UPDATE `PageView` SET `host`='STORE' WHERE `path` LIKE '[STORE]%' AND (`host` IS NULL OR `host`='')");
  const s2 = await prisma.$executeRawUnsafe("UPDATE `PageView` SET `host`='SITO' WHERE `path` LIKE '[SITO]%' AND (`host` IS NULL OR `host`='')");
  console.log(`host backfill: STORE=${s1} SITO=${s2}`);
  const p1 = await prisma.$executeRawUnsafe("UPDATE `PageView` SET `path`=TRIM(SUBSTRING(`path`,9)) WHERE `path` LIKE '[STORE] %'");
  const p2 = await prisma.$executeRawUnsafe("UPDATE `PageView` SET `path`=TRIM(SUBSTRING(`path`,8)) WHERE `path` LIKE '[SITO] %'");
  console.log(`path ripuliti: STORE=${p1} SITO=${p2}`);

  const u = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>("SELECT COUNT(DISTINCT `ipHash`) c FROM `PageView`");
  const ng = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>("SELECT COUNT(*) c FROM `PageView` WHERE `geoCountry` IS NULL");
  console.log(`IP unici (ipHash) da geolocalizzare: ${Number(u[0].c)} | righe senza geo: ${Number(ng[0].c)}`);
}
main().catch((e) => { console.error("ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
