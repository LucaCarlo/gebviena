import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.designer.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("designers", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();

    if (body.slug) {
      const existing = await prisma.designer.findFirst({
        where: { slug: body.slug, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Lo slug "${body.slug}" è già usato da un altro designer` },
          { status: 400 }
        );
      }
    }

    const data = await prisma.designer.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("designers", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.designer.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
