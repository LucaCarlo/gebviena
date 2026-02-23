import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Last 7 days boundaries
  const days: { label: string; start: Date; end: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    days.push({
      label: d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" }),
      start: d,
      end: next,
    });
  }

  const [
    products,
    designers,
    projects,
    campaigns,
    awards,
    stores,
    agents,
    heroSlides,
    languages,
    mediaFiles,
    contacts,
    unreadContacts,
    newsletter,
    users,
    pageViews,
    todayViews,
    mediaSynced,
    mediaUnsynced,
    mediaAgg,
    recentProducts,
    recentProjects,
    ...dailyViews
  ] = await Promise.all([
    prisma.product.count(),
    prisma.designer.count(),
    prisma.project.count(),
    prisma.campaign.count(),
    prisma.award.count(),
    prisma.pointOfSale.count(),
    prisma.pointOfSale.count({ where: { type: "agent" } }),
    prisma.heroSlide.count(),
    prisma.language.count(),
    prisma.mediaFile.count(),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { isRead: false } }),
    prisma.newsletterSubscriber.count(),
    prisma.adminUser.count(),
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.mediaFile.count({ where: { isSynced: true } }),
    prisma.mediaFile.count({ where: { isSynced: false } }),
    prisma.mediaFile.aggregate({ _sum: { size: true, originalSize: true } }),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, coverImage: true, imageUrl: true, category: true, createdAt: true },
    }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, imageUrl: true, type: true, createdAt: true },
    }),
    ...days.map((d) =>
      prisma.pageView.count({ where: { createdAt: { gte: d.start, lt: d.end } } })
    ),
  ]);

  const totalStorage = mediaAgg._sum.size || 0;
  const totalOriginalSize = mediaAgg._sum.originalSize || 0;
  const savedBytes = totalOriginalSize > 0 ? totalOriginalSize - totalStorage : 0;

  const viewsChart = days.map((d, i) => ({
    label: d.label,
    views: dailyViews[i] as number,
  }));

  return NextResponse.json({
    success: true,
    data: {
      products,
      designers,
      projects,
      campaigns,
      awards,
      stores,
      agents,
      heroSlides,
      languages,
      mediaFiles,
      contacts,
      unreadContacts,
      newsletter,
      users,
      pageViews,
      todayViews,
      mediaSynced,
      mediaUnsynced,
      totalStorage,
      totalOriginalSize,
      savedBytes,
      viewsChart,
      recentProducts,
      recentProjects,
    },
  });
}
