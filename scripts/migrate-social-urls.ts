/**
 * One-time migration: Copy social URLs from user emailSignature JSON
 * into their assigned SignatureTemplate records.
 *
 * Run with: npx tsx scripts/migrate-social-urls.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.signatureTemplate.findMany({
    include: {
      users: {
        select: { id: true, name: true, email: true, emailSignature: true },
      },
    },
  });

  console.log(`Found ${templates.length} template(s) to migrate.\n`);

  for (const template of templates) {
    let instagramUrl: string | null = null;
    let facebookUrl: string | null = null;
    let webLinkUrl: string | null = null;
    let websiteUrl: string | null = null;
    let website: string | null = null;

    // Try to extract social URLs from the first user that has them
    for (const user of template.users) {
      if (!user.emailSignature) continue;
      try {
        const data = JSON.parse(user.emailSignature);
        if (!instagramUrl && data.instagramUrl) instagramUrl = data.instagramUrl;
        if (!facebookUrl && data.facebookUrl) facebookUrl = data.facebookUrl;
        if (!webLinkUrl && data.webLinkUrl) webLinkUrl = data.webLinkUrl;
        if (!websiteUrl && data.websiteUrl) websiteUrl = data.websiteUrl;
        if (!website && data.website) website = data.website;
      } catch {
        // ignore parse errors
      }
    }

    // Fall back to GTV defaults if no user data found
    const finalData = {
      instagramUrl: instagramUrl || "https://www.instagram.com/gebruder_thonet_vienna/",
      facebookUrl: facebookUrl || "https://www.facebook.com/GebruderThonetVienna",
      webLinkUrl: webLinkUrl || "https://www.gebruederthonetvienna.com/en",
      websiteUrl: websiteUrl || "http://www.gebruederthonetvienna.com",
      website: website || "www.gebruederthonetvienna.com",
      disclaimerLang: "it",
    };

    await prisma.signatureTemplate.update({
      where: { id: template.id },
      data: finalData,
    });

    console.log(`✓ Updated template "${template.name}" (${template.id}) — ${template.users.length} user(s)`);
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
