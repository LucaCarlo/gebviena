import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** GET — dettaglio completo di un professional + tag associati (per email).
 *  Usato dalla pagina /admin/persone/professionisti/:id. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const pro = await prisma.professional.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true,
      firstName: true, lastName: true, phone: true, company: true,
      role: true, language: true,
      acceptsPrivacy: true, marketingOptIn: true,
      pendingApproval: true, isActive: true,
      createdAt: true, updatedAt: true, lastLoginAt: true, approvedAt: true,
    },
  });
  if (!pro) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  // Tag associati alla email (cross-entità: stesso sistema di tag usato per subscribers/leads)
  const tagsLink = await prisma.contactTag.findMany({
    where: { email: pro.email },
    select: { createdAt: true, tag: { select: { id: true, name: true, slug: true, color: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...pro,
      tags: tagsLink.map((tl) => ({ ...tl.tag, addedAt: tl.createdAt })),
    },
  });
}

/** PATCH — toggle isActive, marketingOptIn, oppure aggiorna anagrafica. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data: {
      isActive?: boolean;
      marketingOptIn?: boolean;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      company?: string;
      language?: string;
    } = {};
    if (typeof body.isActive === "boolean")        data.isActive = body.isActive;
    if (typeof body.marketingOptIn === "boolean")  data.marketingOptIn = body.marketingOptIn;
    if (typeof body.firstName === "string")        data.firstName = body.firstName.trim().slice(0, 128);
    if (typeof body.lastName === "string")         data.lastName  = body.lastName.trim().slice(0, 128);
    if (typeof body.phone === "string")            data.phone     = body.phone.trim().slice(0, 32) || null;
    if (typeof body.company === "string")          data.company   = body.company.trim().slice(0, 255);
    if (typeof body.language === "string" && ["it","fr","en","de","es"].includes(body.language.toLowerCase())) {
      data.language = body.language.toLowerCase();
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nessun campo aggiornabile" }, { status: 400 });
    }
    const updated = await prisma.professional.update({
      where: { id: params.id },
      data,
      select: { id: true, isActive: true, marketingOptIn: true, firstName: true, lastName: true, phone: true, company: true, language: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;
  try {
    await prisma.professional.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
