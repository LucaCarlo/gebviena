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
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalViews, todayViews, topPages, recentViews, allViewsLast30] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.pageView.groupBy({
      by: ["path"],
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.pageView.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  // Group views by day for the last 30 days
  const viewsByDayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    viewsByDayMap[key] = 0;
  }
  for (const view of allViewsLast30) {
    const key = view.createdAt.toISOString().split("T")[0];
    if (viewsByDayMap[key] !== undefined) {
      viewsByDayMap[key]++;
    }
  }
  const viewsByDay = Object.entries(viewsByDayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const uniquePages = topPages.length;
  const avgDailyViews = viewsByDay.length > 0
    ? Math.round(viewsByDay.reduce((sum, d) => sum + d.count, 0) / viewsByDay.length)
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      totalViews,
      todayViews,
      uniquePages,
      avgDailyViews,
      topPages: topPages.map((p) => ({ path: p.path, count: p._count.path })),
      dailyViews: viewsByDay,
      recentViews,
    },
  });
}
