/** Imposta GTM/GA4 (group=analytics). */
import { prisma } from "../src/lib/prisma";
const V: Record<string, string> = {
  gtm_site_id: "GTM-KLGKFRJP",
  gtm_store_id: "GTM-WRB439JG",
  ga4_id: "G-2GHH3Z2384",
};
async function main() {
  for (const [key, value] of Object.entries(V)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value, group: "analytics" } });
  }
  const r = await prisma.setting.findMany({ where: { group: "analytics" }, select: { key: true, value: true } });
  console.log("settings analytics:", JSON.stringify(r));
}
main().catch((e) => { console.error("ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
