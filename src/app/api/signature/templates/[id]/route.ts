import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { renderSignature, DEFAULT_USER_DATA } from "@/app/admin/firma/_components/signatureRenderer";
import type { SignatureUserData, SignatureTemplateData } from "@/app/admin/firma/_components/signatureRenderer";

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

    // Regenerate signatureHtml for all assigned users
    const assignedUsers = await prisma.adminUser.findMany({
      where: { signatureTemplateId: id },
      select: { id: true, emailSignature: true },
    });

    const templateData: SignatureTemplateData = {
      logoUrl: data.logoUrl, bannerUrl: data.bannerUrl,
      showInstagram: data.showInstagram, showFacebook: data.showFacebook,
      showWeb: data.showWeb, showLinkedin: data.showLinkedin,
      showPinterest: data.showPinterest,
      instagramUrl: data.instagramUrl, facebookUrl: data.facebookUrl,
      webLinkUrl: data.webLinkUrl, linkedinUrl: data.linkedinUrl,
      pinterestUrl: data.pinterestUrl,
      websiteUrl: data.websiteUrl, website: data.website,
      disclaimerLang: (data.disclaimerLang as "it" | "en" | "both") || "it",
      footerIt: data.footerIt, footerEn: data.footerEn, ecoText: data.ecoText,
      style: (data.style as "classic" | "geb" | "geb-gradient") || "geb",
    };

    for (const user of assignedUsers) {
      let userData: SignatureUserData = { ...DEFAULT_USER_DATA };
      if (user.emailSignature) {
        try {
          const parsed = JSON.parse(user.emailSignature);
          if (parsed.version === 3) {
            userData = {
              fullName: parsed.fullName || DEFAULT_USER_DATA.fullName,
              department: parsed.department || DEFAULT_USER_DATA.department,
              infoLine1: parsed.infoLine1 || DEFAULT_USER_DATA.infoLine1,
              infoLine2: parsed.infoLine2 || DEFAULT_USER_DATA.infoLine2,
              address: parsed.address || DEFAULT_USER_DATA.address,
              phone: parsed.phone || DEFAULT_USER_DATA.phone,
              mobile: parsed.mobile || "",
            };
          }
        } catch { /* ignore */ }
      }
      const html = renderSignature(userData, templateData);
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { signatureHtml: html },
      });
    }

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
