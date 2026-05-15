/** Imposta i tempi di consegna store a "6 settimane" / "6 semaines". */
import { prisma } from "../src/lib/prisma";

async function main() {
  const vals: Record<string, string> = {
    "store.delivery_lead_time": "6 settimane",
    "store.delivery_lead_time_fr": "6 semaines",
  };
  for (const [key, value] of Object.entries(vals)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: "store_general" },
    });
    console.log(`set ${key} = ${value}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
