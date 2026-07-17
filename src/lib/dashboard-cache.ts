import { prisma } from "@/lib/prisma";

export interface DashboardStatsData {
  products: number;
  designers: number;
  projects: number;
  campaigns: number;
  awards: number;
  stores: number;
  agents: number;
  heroSlides: number;
  languages: number;
  mediaFiles: number;
  contacts: number;
  unreadContacts: number;
  newsletter: number;
  users: number;
  pageViews: number;
  todayViews: number;
  mediaSynced: number;
  mediaUnsynced: number;
  totalStorage: number;
  totalOriginalSize: number;
  savedBytes: number;
  viewsChart: { label: string; views: number }[];
  recentProducts: {
    id: string;
    name: string;
    coverImage: string | null;
    imageUrl: string;
    category: string;
    createdAt: Date;
  }[];
  recentProjects: {
    id: string;
    name: string;
    imageUrl: string;
    type: string;
    createdAt: Date;
  }[];
}

const TTL_MS = 60_000;
let cache: { data: DashboardStatsData; expiresAt: number } | null = null;
let inflight: Promise<DashboardStatsData> | null = null;

async function fetchDashboardStats(): Promise<DashboardStatsData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

  return {
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
    viewsChart: days.map((d, i) => ({ label: d.label, views: dailyViews[i] as number })),
    recentProducts,
    recentProjects,
  };
}

export async function getDashboardStats(): Promise<DashboardStatsData> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  if (inflight) return inflight;
  inflight = fetchDashboardStats()
    .then((data) => {
      cache = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function invalidateDashboardStats() {
  cache = null;
}
