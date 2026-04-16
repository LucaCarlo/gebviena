import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Full DB backup/restore.
 *
 * Exports all Prisma models as a JSON dump. Restores by truncating every
 * listed table (FK checks disabled) then inserting the dumped rows.
 *
 * Limitations the admin must know:
 *  - Files in /public/uploads (images, PDFs, videos) are NOT included.
 *    The MediaFile metadata IS exported (filename, url) but the binary
 *    content must be migrated separately via rsync/tar.
 *  - Wasabi-hosted assets keep working as long as the bucket is reachable.
 *  - The destination DB must be on the same Prisma schema version.
 */

// Order matters for the TRUNCATE step only via FK_CHECKS=0 reset; for
// createMany we insert top-level first → entities → junction/translations.
type ModelKey = keyof typeof prisma & string;

const MODELS: { name: string; key: ModelKey; table: string }[] = [
  // top-level (no FK in)
  { name: "adminUsers", key: "adminUser" as ModelKey, table: "AdminUser" },
  { name: "roles", key: "role" as ModelKey, table: "Role" },
  { name: "signatureTemplates", key: "signatureTemplate" as ModelKey, table: "SignatureTemplate" },
  { name: "settings", key: "setting" as ModelKey, table: "Setting" },
  { name: "languages", key: "language" as ModelKey, table: "Language" },
  { name: "pointsOfSale", key: "pointOfSale" as ModelKey, table: "PointOfSale" },
  { name: "newsletterSubscribers", key: "newsletterSubscriber" as ModelKey, table: "NewsletterSubscriber" },
  { name: "contactSubmissions", key: "contactSubmission" as ModelKey, table: "ContactSubmission" },
  { name: "pageViews", key: "pageView" as ModelKey, table: "PageView" },
  { name: "tags", key: "tag" as ModelKey, table: "Tag" },
  { name: "mediaFiles", key: "mediaFile" as ModelKey, table: "MediaFile" },
  { name: "redirects", key: "redirect" as ModelKey, table: "Redirect" },
  { name: "uiTranslationOverrides", key: "uiTranslationOverride" as ModelKey, table: "UiTranslationOverride" },
  { name: "pageImages", key: "pageImage" as ModelKey, table: "PageImage" },
  { name: "formConfigs", key: "formConfig" as ModelKey, table: "FormConfig" },
  { name: "dimensionBlocks", key: "dimensionBlock" as ModelKey, table: "DimensionBlock" },
  { name: "emailTemplates", key: "emailTemplate" as ModelKey, table: "EmailTemplate" },
  { name: "landingPageConfigs", key: "landingPageConfig" as ModelKey, table: "LandingPageConfig" },
  // entities (depend on top-level)
  { name: "designers", key: "designer" as ModelKey, table: "Designer" },
  { name: "products", key: "product" as ModelKey, table: "Product" },
  { name: "projects", key: "project" as ModelKey, table: "Project" },
  { name: "campaigns", key: "campaign" as ModelKey, table: "Campaign" },
  { name: "newsArticles", key: "newsArticle" as ModelKey, table: "NewsArticle" },
  { name: "awards", key: "award" as ModelKey, table: "Award" },
  { name: "heroSlides", key: "heroSlide" as ModelKey, table: "HeroSlide" },
  { name: "catalogs", key: "catalog" as ModelKey, table: "Catalog" },
  { name: "contentTypologies", key: "contentTypology" as ModelKey, table: "ContentTypology" },
  { name: "contentCategories", key: "contentCategory" as ModelKey, table: "ContentCategory" },
  { name: "contentSubcategories", key: "contentSubcategory" as ModelKey, table: "ContentSubcategory" },
  // junctions
  { name: "projectProducts", key: "projectProduct" as ModelKey, table: "ProjectProduct" },
  { name: "awardProducts", key: "awardProduct" as ModelKey, table: "AwardProduct" },
  { name: "contactTags", key: "contactTag" as ModelKey, table: "ContactTag" },
  { name: "contentTypologyCategories", key: "contentTypologyCategory" as ModelKey, table: "ContentTypologyCategory" },
  // translations
  { name: "productTranslations", key: "productTranslation" as ModelKey, table: "ProductTranslation" },
  { name: "designerTranslations", key: "designerTranslation" as ModelKey, table: "DesignerTranslation" },
  { name: "projectTranslations", key: "projectTranslation" as ModelKey, table: "ProjectTranslation" },
  { name: "campaignTranslations", key: "campaignTranslation" as ModelKey, table: "CampaignTranslation" },
  { name: "newsArticleTranslations", key: "newsArticleTranslation" as ModelKey, table: "NewsArticleTranslation" },
  { name: "catalogTranslations", key: "catalogTranslation" as ModelKey, table: "CatalogTranslation" },
  { name: "heroSlideTranslations", key: "heroSlideTranslation" as ModelKey, table: "HeroSlideTranslation" },
  { name: "awardTranslations", key: "awardTranslation" as ModelKey, table: "AwardTranslation" },
  { name: "contentCategoryTranslations", key: "contentCategoryTranslation" as ModelKey, table: "ContentCategoryTranslation" },
  { name: "contentTypologyTranslations", key: "contentTypologyTranslation" as ModelKey, table: "ContentTypologyTranslation" },
  { name: "contentSubcategoryTranslations", key: "contentSubcategoryTranslation" as ModelKey, table: "ContentSubcategoryTranslation" },
  { name: "mediaFileTranslations", key: "mediaFileTranslation" as ModelKey, table: "MediaFileTranslation" },
  { name: "formConfigTranslations", key: "formConfigTranslation" as ModelKey, table: "FormConfigTranslation" },
  // events
  { name: "eventRegistrations", key: "eventRegistration" as ModelKey, table: "EventRegistration" },
  { name: "eventInvitations", key: "eventInvitation" as ModelKey, table: "EventInvitation" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = { findMany: (args?: unknown) => Promise<unknown[]>; createMany: (args: { data: unknown[] }) => Promise<unknown> };

function delegate(key: string): AnyDelegate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[key] as AnyDelegate;
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const data: Record<string, unknown[]> = {};
    await Promise.all(
      MODELS.map(async (m) => {
        try {
          data[m.name] = await delegate(m.key).findMany();
        } catch {
          data[m.name] = [];
        }
      })
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        exportedAt: new Date().toISOString(),
        modelCount: MODELS.length,
        rowCount: Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
        warning: "Il backup NON include i file binari in /public/uploads (immagini, PDF, video). Migrarli separatamente via rsync/tar.",
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = (body.data || body) as Record<string, unknown[]>;
    const counts: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // Disable FK checks so TRUNCATE order doesn't matter (MySQL/MariaDB).
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      try {
        for (const m of MODELS) {
          try { await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${m.table}\``); }
          catch { /* table may not exist on older schemas — skip */ }
        }
        for (const m of MODELS) {
          const rows = data[m.name];
          if (!Array.isArray(rows) || rows.length === 0) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any)[m.key].createMany({ data: rows, skipDuplicates: true });
            counts[m.name] = rows.length;
          } catch (e) {
            counts[m.name] = -1; // signal failure for this table
            console.error(`Backup restore failed for ${m.table}:`, e);
          }
        }
      } finally {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
      }
    }, { timeout: 120000 });

    return NextResponse.json({
      success: true,
      data: { counts, importedAt: new Date().toISOString() },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
