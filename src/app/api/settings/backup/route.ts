import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const [
      products,
      designers,
      projects,
      projectProducts,
      campaigns,
      awards,
      heroSlides,
      languages,
      pointsOfSale,
      newsletterSubscribers,
      contactSubmissions,
      settings,
      mediaFiles,
      adminUsers,
    ] = await Promise.all([
      prisma.product.findMany(),
      prisma.designer.findMany(),
      prisma.project.findMany(),
      prisma.projectProduct.findMany(),
      prisma.campaign.findMany(),
      prisma.award.findMany(),
      prisma.heroSlide.findMany(),
      prisma.language.findMany(),
      prisma.pointOfSale.findMany(),
      prisma.newsletterSubscriber.findMany(),
      prisma.contactSubmission.findMany(),
      prisma.setting.findMany(),
      prisma.mediaFile.findMany(),
      prisma.adminUser.findMany(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        designers,
        projects,
        projectProducts,
        campaigns,
        awards,
        heroSlides,
        languages,
        pointsOfSale,
        newsletterSubscribers,
        contactSubmissions,
        settings,
        mediaFiles,
        adminUsers,
      },
      exportedAt: new Date().toISOString(),
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
    const data = body.data || body;

    const counts: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // Delete all existing data in correct order (respect foreign keys)
      await tx.projectProduct.deleteMany();
      await tx.product.deleteMany();
      await tx.designer.deleteMany();
      await tx.project.deleteMany();
      await tx.campaign.deleteMany();
      await tx.award.deleteMany();
      await tx.heroSlide.deleteMany();
      await tx.language.deleteMany();
      await tx.pointOfSale.deleteMany();
      await tx.newsletterSubscriber.deleteMany();
      await tx.contactSubmission.deleteMany();
      await tx.setting.deleteMany();
      await tx.mediaFile.deleteMany();
      await tx.adminUser.deleteMany();

      // Import data
      if (data.designers?.length) {
        await tx.designer.createMany({ data: data.designers });
        counts.designers = data.designers.length;
      }

      if (data.products?.length) {
        await tx.product.createMany({ data: data.products });
        counts.products = data.products.length;
      }

      if (data.projects?.length) {
        await tx.project.createMany({ data: data.projects });
        counts.projects = data.projects.length;
      }

      if (data.projectProducts?.length) {
        await tx.projectProduct.createMany({ data: data.projectProducts });
        counts.projectProducts = data.projectProducts.length;
      }

      if (data.campaigns?.length) {
        await tx.campaign.createMany({ data: data.campaigns });
        counts.campaigns = data.campaigns.length;
      }

      if (data.awards?.length) {
        await tx.award.createMany({ data: data.awards });
        counts.awards = data.awards.length;
      }

      if (data.heroSlides?.length) {
        await tx.heroSlide.createMany({ data: data.heroSlides });
        counts.heroSlides = data.heroSlides.length;
      }

      if (data.languages?.length) {
        await tx.language.createMany({ data: data.languages });
        counts.languages = data.languages.length;
      }

      if (data.pointsOfSale?.length) {
        await tx.pointOfSale.createMany({ data: data.pointsOfSale });
        counts.pointsOfSale = data.pointsOfSale.length;
      }

      if (data.newsletterSubscribers?.length) {
        await tx.newsletterSubscriber.createMany({ data: data.newsletterSubscribers });
        counts.newsletterSubscribers = data.newsletterSubscribers.length;
      }

      if (data.contactSubmissions?.length) {
        await tx.contactSubmission.createMany({ data: data.contactSubmissions });
        counts.contactSubmissions = data.contactSubmissions.length;
      }

      if (data.settings?.length) {
        await tx.setting.createMany({ data: data.settings });
        counts.settings = data.settings.length;
      }

      if (data.mediaFiles?.length) {
        await tx.mediaFile.createMany({ data: data.mediaFiles });
        counts.mediaFiles = data.mediaFiles.length;
      }

      if (data.adminUsers?.length) {
        await tx.adminUser.createMany({ data: data.adminUsers });
        counts.adminUsers = data.adminUsers.length;
      }
    });

    return NextResponse.json({ success: true, data: { counts, importedAt: new Date().toISOString() } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
