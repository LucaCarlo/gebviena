import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("catalogs", "create");
  if (isErrorResponse(result)) return result;

  try {
    const src = await prisma.catalog.findUnique({ where: { id: params.id } });
    if (!src) return NextResponse.json({ success: false, error: "Catalogo non trovato" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, updatedAt: _ua, slug: _slug, ...rest } = src as any;

    const baseSlug = `${src.slug}-copy`;
    let candidate = baseSlug;
    let suffix = 1;
    while (await prisma.catalog.findUnique({ where: { slug: candidate } })) {
      suffix++;
      candidate = `${baseSlug}-${suffix}`;
    }

    const data = await prisma.catalog.create({
      data: {
        ...rest,
        slug: candidate,
        name: `${src.name} (copia)`,
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
