import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET — list all templates
export async function GET() {
  const result = await requirePermission("firma", "view");
  if (isErrorResponse(result)) return result;

  const data = await prisma.signatureTemplate.findMany({
    include: {
      users: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data });
}

// POST — create template
export async function POST(req: Request) {
  const result = await requirePermission("firma", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.signatureTemplate.create({
      data: {
        name: body.name || "Nuovo Template",
        logoUrl: body.logoUrl || null,
        bannerUrl: body.bannerUrl || null,
        showInstagram: body.showInstagram ?? true,
        showFacebook: body.showFacebook ?? true,
        showWeb: body.showWeb ?? true,
        instagramUrl: body.instagramUrl || null,
        facebookUrl: body.facebookUrl || null,
        webLinkUrl: body.webLinkUrl || null,
        websiteUrl: body.websiteUrl || null,
        website: body.website || null,
        disclaimerLang: body.disclaimerLang || "it",
        footerIt: body.footerIt || null,
        footerEn: body.footerEn || null,
        ecoText: body.ecoText || null,
      },
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
