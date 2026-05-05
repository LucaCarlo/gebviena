import { prisma } from "../src/lib/prisma";

const TEMPLATE_NAME = "Invito alla svendita";
const SUBJECT = "Vendita Speciale GTV — accesso riservato";

const BLOCKS = [
  {
    type: "title",
    text: "Vendita Speciale Gebrüder Thonet Vienna",
    fontFamily: "Libre Caslon Text",
    fontSize: "28",
    color: "#1a1a1a",
    align: "left",
  },
  {
    type: "text",
    content:
      "Ciao {{firstName}},\n\nti invitiamo a partecipare alla nostra Vendita Speciale: una selezione di prodotti GTV a condizioni dedicate, online e nello showroom di Torino.",
    fontFamily: "Arial",
    textColor: "#333333",
    align: "left",
  },
  {
    type: "text",
    content:
      "<strong>Online:</strong> sconti fino al 40% — accesso su registrazione, fino a esaurimento.<br/><strong>Showroom Torino (Via Foggia 23H):</strong> sconti fino al 70% — pezzi unici, fine serie, shooting e fiere.<br/><strong>Periodo:</strong> dal 15 Maggio al 30 Giugno 2026.",
    fontFamily: "Arial",
    textColor: "#444444",
    align: "left",
  },
  { type: "spacer", height: 12 },
  {
    type: "button",
    text: "Scopri l'offerta",
    url: "https://dev.gebruederthonetvienna.com/accesso-svendita-gtv",
    color: "#000000",
    align: "center",
    borderRadius: "0",
  },
  { type: "spacer", height: 16 },
  { type: "divider" },
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
      sortOrder: 1,
    },
  });
  console.log(`Created template: ${created.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
