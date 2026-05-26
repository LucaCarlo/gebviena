/**
 * Audit retroattivo spam Gmail "dot abuse" su NewsletterSubscriber + EventRegistration.
 *
 * Uso:
 *   tsx scripts/spam-audit.ts           # solo report (dry-run)
 *   tsx scripts/spam-audit.ts --delete  # cancella i match (DOPO review!)
 */

import { PrismaClient } from "@prisma/client";
import { isLikelyDotSpam } from "../src/lib/email-spam";

const prisma = new PrismaClient();

async function main() {
  const doDelete = process.argv.includes("--delete");

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { OR: [{ email: { endsWith: "@gmail.com" } }, { email: { endsWith: "@googlemail.com" } }] },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const evRegs = await prisma.eventRegistration.findMany({
    where: { OR: [{ email: { endsWith: "@gmail.com" } }, { email: { endsWith: "@googlemail.com" } }] },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, landingPageId: true },
    orderBy: { createdAt: "desc" },
  });

  const spamSubs = subs.filter((s) => isLikelyDotSpam(s.email));
  const spamEvRegs = evRegs.filter((r) => isLikelyDotSpam(r.email));

  console.log("\n══ SPAM NewsletterSubscriber ══");
  console.log(`Totale candidati: ${spamSubs.length} / ${subs.length} Gmail`);
  for (const s of spamSubs.slice(0, 30)) {
    console.log(`  ${s.id} · ${s.email} · ${s.createdAt.toISOString().slice(0, 10)}`);
  }
  if (spamSubs.length > 30) console.log(`  ... e altri ${spamSubs.length - 30}`);

  console.log("\n══ SPAM EventRegistration ══");
  console.log(`Totale candidati: ${spamEvRegs.length} / ${evRegs.length} Gmail`);
  for (const r of spamEvRegs.slice(0, 30)) {
    console.log(`  ${r.id} · ${r.email} · ${r.firstName} ${r.lastName} · ${r.createdAt.toISOString().slice(0, 10)}`);
  }
  if (spamEvRegs.length > 30) console.log(`  ... e altri ${spamEvRegs.length - 30}`);

  if (!doDelete) {
    console.log("\n[DRY-RUN] Nessuna cancellazione. Rilancia con --delete per cancellare.\n");
    return;
  }

  console.log("\n══ CANCELLAZIONE ══");
  let delSubs = 0;
  for (const s of spamSubs) {
    try {
      await prisma.newsletterSubscriber.delete({ where: { id: s.id } });
      delSubs++;
    } catch (e) {
      console.error(`  ERROR delete sub ${s.id}:`, (e as Error).message);
    }
  }
  console.log(`NewsletterSubscriber cancellati: ${delSubs}`);

  let delEv = 0;
  for (const r of spamEvRegs) {
    try {
      // Prima cancella eventuali EventInvitation collegate (FK)
      await prisma.eventInvitation.updateMany({
        where: { registrationId: r.id },
        data: { registrationId: null, registeredAt: null },
      }).catch(() => {});
      await prisma.eventRegistration.delete({ where: { id: r.id } });
      delEv++;
    } catch (e) {
      console.error(`  ERROR delete evReg ${r.id}:`, (e as Error).message);
    }
  }
  console.log(`EventRegistration cancellati: ${delEv}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
