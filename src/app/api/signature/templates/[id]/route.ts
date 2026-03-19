import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET — single template
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("firma", "view");
  if (isErrorResponse(result)) return result;

  const { id } = await params;
  const data = await prisma.signatureTemplate.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!data)
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  return NextResponse.json({ success: true, data });
}

// PUT — update template
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("firma", "edit");
  if (isErrorResponse(result)) return result;

  const { id } = await params;

  try {
    const body = await req.json();

    const data = await prisma.signatureTemplate.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        logoUrl: body.logoUrl ?? undefined,
        bannerUrl: body.bannerUrl ?? undefined,
        showInstagram: body.showInstagram ?? undefined,
        showFacebook: body.showFacebook ?? undefined,
        showWeb: body.showWeb ?? undefined,
        instagramUrl: body.instagramUrl ?? undefined,
        facebookUrl: body.facebookUrl ?? undefined,
        webLinkUrl: body.webLinkUrl ?? undefined,
        websiteUrl: body.websiteUrl ?? undefined,
        website: body.website ?? undefined,
        disclaimerLang: body.disclaimerLang ?? undefined,
        footerIt: body.footerIt ?? undefined,
        footerEn: body.footerEn ?? undefined,
        ecoText: body.ecoText ?? undefined,
        style: body.style ?? undefined,
        showLinkedin: body.showLinkedin ?? undefined,
        linkedinUrl: body.linkedinUrl ?? undefined,
        showPinterest: body.showPinterest ?? undefined,
        pinterestUrl: body.pinterestUrl ?? undefined,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

// DELETE — delete template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("firma", "delete");
  if (isErrorResponse(result)) return result;

  const { id } = await params;

  try {
    // Unassign all users first
    await prisma.adminUser.updateMany({
      where: { signatureTemplateId: id },
      data: { signatureTemplateId: null },
    });
    await prisma.signatureTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
