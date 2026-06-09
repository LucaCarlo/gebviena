import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("awards", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;

  const src = await prisma.award.findUnique({ where: { id } });
  if (!src) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = src as any;
  const created = await prisma.award.create({
    data: {
      ...rest,
      name: `${src.name} (copia)`,
      isActive: false,
      scheduledPublishAt: null,
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
