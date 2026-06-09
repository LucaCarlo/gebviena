import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * POST — duplica Campaign. La copia parte come BOZZA (isActive=false),
 * slug = <orig>-copy con suffisso numerico se collide.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("campaigns", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;

  const src = await prisma.campaign.findUnique({ where: { id } });
  if (!src) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  // Slug univoco
  const baseSlug = `${src.slug}-copy`;
  let newSlug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const exists = await prisma.campaign.findUnique({ where: { slug: newSlug }, select: { id: true } });
    if (!exists) break;
    newSlug = `${baseSlug}-${i}`;
  }

  // Costruisco il payload di copia: tutti i campi tranne id/slug/createdAt/updatedAt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _ca, updatedAt: _ua, slug: _slug, ...rest } = src as any;
  const created = await prisma.campaign.create({
    data: {
      ...rest,
      slug: newSlug,
      isActive: false,
      scheduledPublishAt: null,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
