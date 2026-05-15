import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.setting.findMany({ where: { group: "translations" } });
  for (const r of rows) {
    const v = r.value || "";
    const masked = v.length > 12 && (r.key.includes("api_key") || r.key.includes("key"))
      ? v.slice(0, 6) + "…(" + v.length + " chars)"
      : v;
    console.log(`${r.key.padEnd(28)} = ${masked}`);
  }
}
main().finally(() => prisma.$disconnect());
