/**
 * One-shot cleanup:
 *  - Remove the test subscriber lucacarlorecchio25@gmail.com (and its ContactTag rows)
 *  - Remove all EventInvitation rows for the "Accesso Svendita GTV" landing
 *  - Remove the global "invitato" Tag (cascade ContactTag relations)
 */
import { prisma } from "../src/lib/prisma";

const TEST_EMAIL = "lucacarlorecchio25@gmail.com";
const SVENDITA_PERMALINK = "accesso-svendita-gtv";
const INVITATO_TAG_SLUG = "invitato";

async function main() {
  // 1. Subscriber + tag rows for the test user
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { email: TEST_EMAIL } });
  if (sub) {
    const ct = await prisma.contactTag.deleteMany({ where: { email: TEST_EMAIL.toLowerCase() } });
    await prisma.newsletterSubscriber.delete({ where: { id: sub.id } });
    console.log(`✓ Deleted subscriber ${TEST_EMAIL} + ${ct.count} contact-tag rows`);
  } else {
    console.log(`- Subscriber ${TEST_EMAIL} not found (already removed)`);
  }

  // 2. EventInvitation rows for the svendita landing
  const lp = await prisma.landingPageConfig.findUnique({ where: { permalink: SVENDITA_PERMALINK } });
  if (lp) {
    const inv = await prisma.eventInvitation.deleteMany({ where: { landingPageId: lp.id } });
    console.log(`✓ Deleted ${inv.count} EventInvitation rows for landing "${lp.name}"`);
  } else {
    console.log(`- LandingPageConfig ${SVENDITA_PERMALINK} not found`);
  }

  // 3. Global "invitato" tag (cascade ContactTag)
  const tag = await prisma.tag.findUnique({ where: { slug: INVITATO_TAG_SLUG } });
  if (tag) {
    await prisma.tag.delete({ where: { id: tag.id } });
    console.log(`✓ Deleted Tag "${tag.name}" (${tag.id}) — ContactTag rows cascaded`);
  } else {
    console.log(`- Tag slug=${INVITATO_TAG_SLUG} not found`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
