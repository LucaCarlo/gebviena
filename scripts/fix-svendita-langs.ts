/**
 * Cleanup lingua iscritti svendita.
 *
 * Per tutti gli iscritti (NewsletterSubscriber) E i clienti (Customer) che
 * hanno il tag `accesso-svendita-gtv`, se la lingua è diversa da "it" e "fr"
 * la forziamo a "it".
 *
 * Idempotente. Mostra report di quante righe ha toccato.
 * Eseguire UNA VOLTA su dev e UNA VOLTA su prod:
 *   npx tsx scripts/fix-svendita-langs.ts
 */
import { prisma } from "../src/lib/prisma";

const TAG_SLUG = "accesso-svendita-gtv";
const ALLOWED = new Set(["it", "fr"]);

async function main() {
  console.log(`→ Cerco tag con slug "${TAG_SLUG}"…`);
  const tag = await prisma.tag.findUnique({ where: { slug: TAG_SLUG } });
  if (!tag) {
    console.log(`✗ Tag "${TAG_SLUG}" non trovato. Niente da fare.`);
    return;
  }
  console.log(`✓ Tag id=${tag.id}, name="${tag.name}"`);

  // Tutte le email taggate
  const contactTags = await prisma.contactTag.findMany({
    where: { tagId: tag.id },
    select: { email: true },
  });
  const emails = Array.from(new Set(contactTags.map((c) => c.email.toLowerCase().trim()))).filter(Boolean);
  console.log(`→ ${emails.length} email totali col tag`);

  // 1) NewsletterSubscriber
  const subsToFix = await prisma.newsletterSubscriber.findMany({
    where: {
      email: { in: emails },
      languageCode: { notIn: ["it", "fr"] },
    },
    select: { id: true, email: true, languageCode: true },
  });
  console.log(`→ ${subsToFix.length} NewsletterSubscriber da fixare`);
  for (const s of subsToFix) {
    console.log(`   ${s.email} : ${s.languageCode || "(null)"} → it`);
  }
  if (subsToFix.length > 0) {
    const res = await prisma.newsletterSubscriber.updateMany({
      where: { id: { in: subsToFix.map((s) => s.id) } },
      data: { languageCode: "it" },
    });
    console.log(`✓ Aggiornati ${res.count} NewsletterSubscriber`);
  }
  // Anche chi ha languageCode = null lo fissiamo a "it" (di solito sono iscritti
  // dell'admin a mano, conviene mostrarli in italiano)
  const subsNullLang = await prisma.newsletterSubscriber.updateMany({
    where: { email: { in: emails }, languageCode: null },
    data: { languageCode: "it" },
  });
  if (subsNullLang.count > 0) console.log(`✓ Aggiornati ${subsNullLang.count} NewsletterSubscriber (lingua era null) → it`);

  // 2) Customer (tabella separata dello store)
  const custsToFix = await prisma.customer.findMany({
    where: {
      email: { in: emails },
      language: { notIn: ["it", "fr"] },
    },
    select: { id: true, email: true, language: true },
  });
  console.log(`→ ${custsToFix.length} Customer da fixare`);
  for (const c of custsToFix) {
    console.log(`   ${c.email} : ${c.language || "(null)"} → it`);
  }
  if (custsToFix.length > 0) {
    const res = await prisma.customer.updateMany({
      where: { id: { in: custsToFix.map((c) => c.id) } },
      data: { language: "it" },
    });
    console.log(`✓ Aggiornati ${res.count} Customer`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
