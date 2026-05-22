import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TS = "1778765585135";
const MAPPING: { oldLabel: string; newLabel: string; newCode: string; imageUrl: string }[] = [
  { oldLabel: "Chiara", newLabel: "KVADRAT-GUEST-0210", newCode: "upholstery_kvadrat_guest_0210", imageUrl: `/uploads/${TS}-KVADRAT-GUEST-0210.webp` },
  { oldLabel: "Scura",  newLabel: "KVADRAT-GUEST-0190", newCode: "upholstery_kvadrat_guest_0190", imageUrl: `/uploads/${TS}-KVADRAT-GUEST-0190.webp` },
];

async function main() {
  for (const m of MAPPING) {
    // Cerca tramite translation IT con il vecchio label, type=UPHOLSTERY
    const tr = await prisma.storeAttributeValueTranslation.findFirst({
      where: { languageCode: "it", label: m.oldLabel, value: { type: "UPHOLSTERY" } },
    });
    if (!tr) {
      console.log(`✗ Non trovato UPHOLSTERY label='${m.oldLabel}'`);
      continue;
    }
    // Aggiorna valore: imageUrl + code (per coerenza)
    await prisma.storeAttributeValue.update({
      where: { id: tr.valueId },
      data: { imageUrl: m.imageUrl, code: m.newCode },
    });
    // Aggiorna translation con nuovo label
    await prisma.storeAttributeValueTranslation.update({
      where: { id: tr.id },
      data: { label: m.newLabel },
    });
    console.log(`✓ ${m.oldLabel.padEnd(10)} → ${m.newLabel} · img=${m.imageUrl}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
