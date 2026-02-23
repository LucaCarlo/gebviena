import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const [
      productsCount,
      designersCount,
      projectsCount,
      campaignsCount,
      awardsCount,
      heroSlidesCount,
      languagesCount,
      pointsOfSaleCount,
      newsletterSubscribersCount,
      contactSubmissionsCount,
      settingsCount,
      mediaFilesCount,
      adminUsersCount,
      mediaAggregations,
      imageCount,
      syncedCount,
      unsyncedCount,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.designer.count(),
      prisma.project.count(),
      prisma.campaign.count(),
      prisma.award.count(),
      prisma.heroSlide.count(),
      prisma.language.count(),
      prisma.pointOfSale.count(),
      prisma.newsletterSubscriber.count(),
      prisma.contactSubmission.count(),
      prisma.setting.count(),
      prisma.mediaFile.count(),
      prisma.adminUser.count(),
      prisma.mediaFile.aggregate({
        _sum: { size: true, originalSize: true },
      }),
      prisma.mediaFile.count({ where: { mimeType: { startsWith: "image/" } } }),
      prisma.mediaFile.count({ where: { isSynced: true } }),
      prisma.mediaFile.count({ where: { isSynced: false } }),
    ]);

    const totalSize = mediaAggregations._sum.size || 0;
    const totalOriginalSize = mediaAggregations._sum.originalSize || 0;
    const spaceSaved = totalOriginalSize - totalSize;
    const optimizationPercent = totalOriginalSize > 0
      ? Math.round((spaceSaved / totalOriginalSize) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        tables: {
          products: productsCount,
          designers: designersCount,
          projects: projectsCount,
          campaigns: campaignsCount,
          awards: awardsCount,
          heroSlides: heroSlidesCount,
          languages: languagesCount,
          pointsOfSale: pointsOfSaleCount,
          newsletterSubscribers: newsletterSubscribersCount,
          contactSubmissions: contactSubmissionsCount,
          settings: settingsCount,
          mediaFiles: mediaFilesCount,
          adminUsers: adminUsersCount,
        },
        storage: {
          totalSize,
          totalOriginalSize,
          spaceSaved,
          optimizationPercent,
        },
        media: {
          images: imageCount,
          others: mediaFilesCount - imageCount,
          synced: syncedCount,
          unsynced: unsyncedCount,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
