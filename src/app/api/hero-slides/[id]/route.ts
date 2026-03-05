import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.heroSlide.findUnique({ where: { id: params.id } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("hero", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.heroSlide.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("hero", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.heroSlide.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
