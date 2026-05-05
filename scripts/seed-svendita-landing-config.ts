import { prisma } from "../src/lib/prisma";

const SLUG = "accesso-svendita-gtv";
const PERMALINK = "accesso-svendita-gtv";
const NAME = "Accesso Svendita GTV";

async function main() {
  const existing = await prisma.landingPageConfig.findUnique({ where: { permalink: PERMALINK } });
  if (existing) {
    console.log(`LandingPageConfig already exists: ${existing.id} (slug=${existing.slug})`);
    return;
  }
  const created = await prisma.landingPageConfig.create({
    data: {
      slug: SLUG,
      permalink: PERMALINK,
      name: NAME,
      type: "custom",
      tagSlug: "accesso-svendita-gtv",
      heroTitle: "Accesso Riservato alla Vendita Speciale Gebrüder Thonet Vienna",
      heroSubtitle: "Due modalità di accesso, un'unica selezione: online su registrazione, in showroom per una scoperta esclusiva.",
      successTitle: "Richiesta inviata",
      successMessage: "Ti abbiamo inviato un'email di conferma.",
      privacyLabel: "Accetto l'informativa sulla privacy e il trattamento dei miei dati personali.",
      buttonLabel: "Ottieni Accesso",
      isActive: true,
    },
  });
  console.log(`Created LandingPageConfig: ${created.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
