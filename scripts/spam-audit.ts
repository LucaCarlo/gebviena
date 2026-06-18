/**
 * Audit retroattivo "nome troppo lungo" (firstName + " " + lastName > N caratteri).
 * Cancella anche ContactTag orfani (email non più presente nelle 2 tabelle).
 *
 * Uso:
 *   tsx scripts/spam-audit.ts                # dry-run, soglia 28 char
 *   tsx scripts/spam-audit.ts --threshold 25 # cambia soglia
 *   tsx scripts/spam-audit.ts --delete       # cancella per davvero
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const doDelete = process.argv.includes("--delete");
  const threshold = parseInt(arg("--threshold") || "28", 10);
  const skipEventReg = process.argv.includes("--skip-event-reg");
  const keepEmailsStr = arg("--keep-emails") || "";
  const keepEmails = new Set(
    keepEmailsStr.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
  if (keepEmails.size) console.log(`Email salvate dalla cancellazione: ${Array.from(keepEmails).join(", ")}`);
  if (skipEventReg) console.log(`SKIP EventRegistration (--skip-event-reg)`);

  console.log(`Soglia nome completo (firstName + " " + lastName): > ${threshold} caratteri\n`);

  // ─── NEWSLETTER ───
  const subs = await prisma.newsletterSubscriber.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const badSubs = subs.filter((s) => {
    const full = `${s.firstName || ""} ${s.lastName || ""}`.trim();
    if (full.length <= threshold) return false;
    if (keepEmails.has(s.email.toLowerCase().trim())) return false;
    return true;
  });

  // ─── EVENT REGISTRATION ───
  const evRegs = await prisma.eventRegistration.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const badEvRegs = skipEventReg ? [] : evRegs.filter((r) => {
    const full = `${r.firstName} ${r.lastName}`.trim();
    if (full.length <= threshold) return false;
    if (keepEmails.has(r.email.toLowerCase().trim())) return false;
    return true;
  });

  // ─── CONTACT SUBMISSION ───
  const contacts = await prisma.contactSubmission.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const badContacts = contacts.filter((c) => (c.name || "").length > threshold);

  console.log(`══ NewsletterSubscriber > ${threshold} char ══`);
  console.log(`Totale: ${badSubs.length}`);
  for (const s of badSubs) {
    const full = `${s.firstName || ""} ${s.lastName || ""}`.trim();
    console.log(`  [${full.length}]  ${full}  |  ${s.email}  (${s.createdAt.toISOString().slice(0, 10)})`);
  }

  console.log(`\n══ EventRegistration > ${threshold} char ══`);
  console.log(`Totale: ${badEvRegs.length}`);
  for (const r of badEvRegs) {
    const full = `${r.firstName} ${r.lastName}`.trim();
    console.log(`  [${full.length}]  ${full}  |  ${r.email}  (${r.createdAt.toISOString().slice(0, 10)})`);
  }

  console.log(`\n══ ContactSubmission > ${threshold} char ══`);
  console.log(`Totale: ${badContacts.length}`);
  for (const c of badContacts) {
    console.log(`  [${c.name.length}]  ${c.name}  |  ${c.email}  (${c.createdAt.toISOString().slice(0, 10)})`);
  }

  // ─── CONTACTTAG ORFANI ───
  const allTags = await prisma.contactTag.findMany({ select: { id: true, email: true, createdAt: true } });
  const subEmails = new Set(subs.map((s) => s.email.toLowerCase().trim()));
  const evEmails = new Set(evRegs.map((r) => r.email.toLowerCase().trim()));
  const orphanTags = allTags.filter((t) => {
    const e = t.email.toLowerCase().trim();
    return !subEmails.has(e) && !evEmails.has(e);
  });
  console.log(`\n══ ContactTag orfani (email non in NL né EventReg) ══`);
  console.log(`Totale: ${orphanTags.length}`);

  if (!doDelete) {
    console.log("\n[DRY-RUN] Rilancia con --delete per cancellare.\n");
    return;
  }

  console.log("\n══ CANCELLAZIONE ══");
  let delSub = 0;
  for (const s of badSubs) {
    try { await prisma.newsletterSubscriber.delete({ where: { id: s.id } }); delSub++; }
    catch (e) { console.error(`del sub ${s.id}:`, (e as Error).message); }
  }
  console.log(`NewsletterSubscriber cancellati: ${delSub}`);

  let delEv = 0;
  for (const r of badEvRegs) {
    try {
      await prisma.eventInvitation.updateMany({
        where: { registrationId: r.id },
        data: { registrationId: null, registeredAt: null },
      }).catch(() => {});
      await prisma.eventRegistration.delete({ where: { id: r.id } });
      delEv++;
    } catch (e) { console.error(`del ev ${r.id}:`, (e as Error).message); }
  }
  console.log(`EventRegistration cancellati: ${delEv}`);

  let delCt = 0;
  for (const c of badContacts) {
    try { await prisma.contactSubmission.delete({ where: { id: c.id } }); delCt++; }
    catch (e) { console.error(`del contact ${c.id}:`, (e as Error).message); }
  }
  console.log(`ContactSubmission cancellati: ${delCt}`);

  // Ricalcola orfani dopo cleanup
  const newSubs = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
  const newEv = await prisma.eventRegistration.findMany({ select: { email: true } });
  const newSubE = new Set(newSubs.map((s) => s.email.toLowerCase().trim()));
  const newEvE = new Set(newEv.map((r) => r.email.toLowerCase().trim()));
  const finalOrphans = allTags.filter((t) => {
    const e = t.email.toLowerCase().trim();
    return !newSubE.has(e) && !newEvE.has(e);
  });
  let delTag = 0;
  for (const t of finalOrphans) {
    try { await prisma.contactTag.delete({ where: { id: t.id } }); delTag++; }
    catch (e) { console.error(`del tag ${t.id}:`, (e as Error).message); }
  }
  console.log(`ContactTag orfani cancellati: ${delTag}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
