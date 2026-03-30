import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// Public GET - get active landing page config
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isAdmin = searchParams.get("admin") === "true";

  if (isAdmin) {
    const result = await requirePermission("forms", "view");
    if (isErrorResponse(result)) return result;
  }

  const config = await prisma.landingPageConfig.findFirst({
    where: { slug: "default" },
  });

  if (!config) {
    return NextResponse.json({
      success: true,
      data: null,
    });
  }

  return NextResponse.json({ success: true, data: config });
}

// Admin PUT - update landing page config
export async function PUT(req: Request) {
  const result = await requirePermission("forms", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const {
      heroTitle,
      heroSubtitle,
      heroLocation,
      heroDescription,
      successTitle,
      successMessage,
      privacyLabel,
      marketingLabel,
      buttonLabel,
      bannerImage,
      logoImage,
      isActive,
    } = body;

    const config = await prisma.landingPageConfig.upsert({
      where: { slug: "default" },
      update: {
        heroTitle: heroTitle ?? undefined,
        heroSubtitle: heroSubtitle ?? undefined,
        heroLocation: heroLocation ?? undefined,
        heroDescription: heroDescription ?? undefined,
        successTitle: successTitle ?? undefined,
        successMessage: successMessage ?? undefined,
        privacyLabel: privacyLabel ?? undefined,
        marketingLabel: marketingLabel ?? undefined,
        buttonLabel: buttonLabel ?? undefined,
        bannerImage: bannerImage ?? undefined,
        logoImage: logoImage ?? undefined,
        isActive: isActive ?? undefined,
      },
      create: {
        slug: "default",
        heroTitle: heroTitle || "Milan Design Week 2026",
        heroSubtitle,
        heroLocation,
        heroDescription,
        successTitle: successTitle || "Thank you. Your QR code has been generated.",
        successMessage,
        privacyLabel: privacyLabel || "I have read and understood the Privacy Policy.",
        marketingLabel,
        buttonLabel: buttonLabel || "Register",
        bannerImage,
        logoImage,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("Landing page config error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
