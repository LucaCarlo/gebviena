/* Verifica/imposta store maintenance.
   Uso: npx tsx maint-toggle.ts [on|off|status]
*/
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const action = (process.argv[2] || "status").toLowerCase();

  const settings = await prisma.setting.findMany({
    where: { group: "store_maintenance" },
    orderBy: { key: "asc" },
  });

  console.log("=== Current store_maintenance settings ===");
  for (const s of settings) {
    console.log(`${s.key.padEnd(40)} = ${JSON.stringify(s.value)}`);
  }

  if (action === "status") return;

  const enabled = action === "on";
  await prisma.setting.upsert({
    where: { key: "store.maintenance.enabled" },
    update: { value: enabled ? "true" : "false" },
    create: { key: "store.maintenance.enabled", value: enabled ? "true" : "false", group: "store_maintenance" },
  });

  if (enabled) {
    // set defaults if not already set
    for (const [key, def] of [
      ["store.maintenance.title", "Lo shop sta arrivando"],
      ["store.maintenance.message", "Lo store online di Gebrueder Thonet Vienna sara' attivo a breve. Restate sintonizzati."],
      ["store.maintenance.opening_date", ""],
    ] as const) {
      const ex = await prisma.setting.findUnique({ where: { key } });
      if (!ex) {
        await prisma.setting.create({ data: { key, value: def, group: "store_maintenance" } });
      }
    }
  }

  console.log("");
  console.log(`✓ Maintenance set to: ${enabled ? "ON (shop CLOSED)" : "OFF (shop OPEN)"}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
