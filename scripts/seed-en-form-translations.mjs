// Seeds EN translations for FormConfig (form fields labels).
// Run:  node scripts/seed-en-form-translations.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IT label → EN label (shared dictionary across all forms)
const LABEL_EN = {
  "Nome": "First name",
  "Cognome": "Last name",
  "Nome e Cognome": "Full name",
  "Email": "Email",
  "Indirizzo email": "Email address",
  "Azienda": "Company",
  "Azienda / Studio": "Company / Studio",
  "Nome dello studio": "Studio name",
  "Telefono": "Phone",
  "Oggetto": "Subject",
  "Messaggio": "Message",
  "Motivo del contatto": "Reason for contact",
  "Accetto la privacy policy": "I accept the privacy policy",
  "Desidero ricevere aggiornamenti e novità": "I wish to receive updates and news",
  "Partita IVA": "VAT number",
  "Altre informazioni": "Additional information",
  "Presto il consenso per le attività di profilazione": "I give consent for profiling activities",
  "Confermo di aver preso visione dell’ informativa della Privacy e sull’utilizzo dei dati personali": "I confirm I have read the privacy policy and information on the use of personal data",
  "Confermo di aver preso visione dell'informativa della Privacy e sull'utilizzo dei dati personali": "I confirm I have read the privacy policy and information on the use of personal data",
};

const PLACEHOLDER_EN = {
  "Hai qualcosa da aggiungere? Inserisci qui le tue note": "Anything to add? Enter your notes here",
};

async function main() {
  const configs = await prisma.formConfig.findMany();
  let inserted = 0;
  let updated = 0;
  let missing = new Set();

  for (const cfg of configs) {
    let fields;
    try {
      fields = JSON.parse(cfg.fields);
    } catch (e) {
      console.warn(`Skip ${cfg.formType}: invalid JSON`);
      continue;
    }
    const translatedFields = fields.map((f) => {
      const enLabel = LABEL_EN[f.label];
      if (!enLabel && f.label) missing.add(f.label);
      const enPlaceholder = f.placeholder ? PLABEL(PLACEHOLDER_EN, f.placeholder, missing) : undefined;
      return {
        ...f,
        label: enLabel || f.label,
        ...(f.placeholder !== undefined ? { placeholder: enPlaceholder || f.placeholder } : {}),
      };
    });

    const existing = await prisma.formConfigTranslation.findUnique({
      where: { formConfigId_languageCode: { formConfigId: cfg.id, languageCode: "en" } },
    });
    const serialized = JSON.stringify(translatedFields);
    if (existing) {
      if (existing.fields !== serialized) {
        await prisma.formConfigTranslation.update({
          where: { id: existing.id },
          data: { fields: serialized },
        });
        updated++;
      }
    } else {
      await prisma.formConfigTranslation.create({
        data: { formConfigId: cfg.id, languageCode: "en", fields: serialized },
      });
      inserted++;
    }
    console.log(`[${cfg.formType}] ${fields.length} fields processed`);
  }

  if (missing.size > 0) {
    console.warn("\nMissing EN translations for labels:");
    for (const l of missing) console.warn(`  - "${l}"`);
  }

  console.log(`\nForms: inserted ${inserted}, updated ${updated}, total ${configs.length}`);
}

function PLABEL(map, key, missing) {
  if (map[key]) return map[key];
  if (key) missing.add(`[placeholder] ${key}`);
  return undefined;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
