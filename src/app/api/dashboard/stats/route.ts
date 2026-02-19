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

  const [
    products,
    designers,
    projects,
    campaigns,
    awards,
    stores,
    agents,
    finishes,
    heroSlides,
    languages,
    mediaFiles,
    contacts,
    unreadContacts,
    newsletter,
    users,
    pageViews,
    todayViews,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.designer.count(),
    prisma.project.count(),
    prisma.campaign.count(),
    prisma.award.count(),
    prisma.pointOfSale.count(),
    prisma.pointOfSale.count({ where: { type: "agent" } }),
    prisma.finish.count(),
    prisma.heroSlide.count(),
    prisma.language.count(),
    prisma.mediaFile.count(),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { isRead: false } }),
    prisma.newsletterSubscriber.count(),
    prisma.adminUser.count(),
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

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
      finishes,
      heroSlides,
      languages,
      mediaFiles,
      contacts,
      unreadContacts,
      newsletter,
      users,
      pageViews,
      todayViews,
    },
  });
}
