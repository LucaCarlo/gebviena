import { prisma } from "../src/lib/prisma";

const TEMPLATE_NAME = "Conferma pre-accesso svendita";
const SUBJECT = "Conferma registrazione — Vendita Speciale GTV";

const BLOCKS = [
  {
    type: "title",
    text: "Richiesta ricevuta",
    fontFamily: "Libre Caslon Text",
    fontSize: "30",
    color: "#1a1a1a",
    align: "left",
  },
  {
    type: "text",
    content:
      "Ciao {{firstName}},\n\ngrazie per esserti registrato/a alla Vendita Speciale di Gebrüder Thonet Vienna.\n\nLa tua richiesta di accesso è stata ricevuta correttamente. A breve ti contatteremo con le istruzioni per accedere alla selezione online.",
    fontFamily: "Arial",
    textColor: "#333333",
    align: "left",
  },
  { type: "divider" },
  {
    type: "text",
    content:
      "<strong>Periodo:</strong> dal 15 Maggio al 30 Giugno 2026<br/><strong>Showroom Torino:</strong> Via Foggia 23H — accesso diretto su appuntamento",
    fontFamily: "Arial",
    textColor: "#444444",
    align: "left",
  },
  { type: "spacer", height: 16 },
  {
    type: "text",
    content:
      "L'accesso online è riservato agli utenti registrati. I prodotti disponibili online e in showroom differiscono per tipologia e disponibilità. La registrazione non garantisce disponibilità sugli articoli.",
    fontFamily: "Arial",
    textColor: "#888888",
    align: "left",
  },
  { type: "spacer", height: 8 },
  {
    type: "text",
    content: "Gebrüder Thonet Vienna",
    fontFamily: "Arial",
    textColor: "#999999",
    align: "left",
  },
];

async function main() {
  const existing = await prisma.emailTemplate.findFirst({ where: { name: TEMPLATE_NAME } });
  if (existing) {
    console.log(`Template already exists: ${existing.id}`);
    return;
  }
  const created = await prisma.emailTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      subject: SUBJECT,
      blocks: JSON.stringify(BLOCKS),
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log(`Created template: ${created.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
