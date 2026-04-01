/**
 * One-off script: regenerate all user signatures from stored userData + template.
 * Usage: npx tsx scripts/regenerate-signatures.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  renderSignature,
  SignatureUserData,
  SignatureTemplateData,
} from "../src/app/admin/firma/_components/signatureRenderer";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.adminUser.findMany({
    where: {
      emailSignature: { not: null },
      signatureTemplateId: { not: null },
    },
    include: { signatureTemplate: true },
  });

  console.log(`Found ${users.length} users with signatures to regenerate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.emailSignature || !user.signatureTemplate) {
      console.log(`SKIP ${user.email} — missing data`);
      skipped++;
      continue;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(user.emailSignature);
    } catch {
      console.log(`SKIP ${user.email} — invalid JSON`);
      skipped++;
      continue;
    }

    if (parsed.version !== 3) {
      console.log(`SKIP ${user.email} — signature version ${parsed.version}`);
      skipped++;
      continue;
    }

    const userData: SignatureUserData = {
      fullName: (parsed.fullName as string) || "",
      department: (parsed.department as string) || "",
      infoLine1: (parsed.infoLine1 as string) || "",
      infoLine2: (parsed.infoLine2 as string) || "",
      address: (parsed.address as string) || "",
      phone: (parsed.phone as string) || "",
      mobile: (parsed.mobile as string) || undefined,
    };

    const tpl = user.signatureTemplate;
    const templateData: SignatureTemplateData = {
      id: tpl.id,
      name: tpl.name,
      logoUrl: tpl.logoUrl,
      bannerUrl: tpl.bannerUrl,
      showInstagram: tpl.showInstagram,
      showFacebook: tpl.showFacebook,
      showWeb: tpl.showWeb,
      showLinkedin: tpl.showLinkedin,
      showPinterest: tpl.showPinterest,
      instagramUrl: tpl.instagramUrl,
      facebookUrl: tpl.facebookUrl,
      webLinkUrl: tpl.webLinkUrl,
      linkedinUrl: tpl.linkedinUrl,
      pinterestUrl: tpl.pinterestUrl,
      websiteUrl: tpl.websiteUrl,
      website: tpl.website,
      disclaimerLang: tpl.disclaimerLang as "it" | "en" | "both",
      footerIt: tpl.footerIt,
      footerEn: tpl.footerEn,
      ecoText: tpl.ecoText,
      style: tpl.style as "classic" | "geb" | "geb-gradient",
      logoGlowUrl: (tpl as Record<string, unknown>).logoGlowUrl as string | null | undefined,
    };

    const newHtml = renderSignature(userData, templateData);

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { signatureHtml: newHtml },
    });

    console.log(`OK   ${user.email} (${tpl.style})`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
