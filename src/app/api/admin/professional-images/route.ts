import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const result = await requirePermission("products", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const typology = searchParams.get("typology");
  const projectId = searchParams.get("projectId");
  const summary = searchParams.get("summary");

  if (summary === "typology") {
    const rows = await prisma.professionalImage.groupBy({
      by: ["typology"],
      where: { isActive: true, typology: { not: null } },
      _count: { _all: true },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({ typology: r.typology, count: r._count._all })),
    });
  }

  if (summary === "product") {
    const rows = await prisma.professionalImage.groupBy({
      by: ["productId"],
      where: { isActive: true, productId: { not: null } },
      _count: { _all: true },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({ productId: r.productId, count: r._count._all })),
    });
  }

  if (summary === "project") {
    const rows = await prisma.professionalImage.groupBy({
      by: ["projectId"],
      where: { isActive: true, projectId: { not: null } },
      _count: { _all: true },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({ projectId: r.projectId, count: r._count._all })),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };
  if (productId) where.productId = productId;
  if (typology) where.typology = typology;
  if (projectId) where.projectId = projectId;
  const rows = await prisma.professionalImage.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ success: true, data: rows });
}

interface ProfImageItem {
  fileUrl: string;
  fileName: string;
  size?: number;
  width?: number;
  height?: number;
}

/** Crea record ProfessionalImage per N file gia caricati via /api/upload.
 *  Il body e JSON, NON multipart. Il client deve prima caricare i file via
 *  /api/upload (compressione automatica + WebP + record MediaFile globale)
 *  e poi linkarli qui passando gli URL ottenuti. In questo modo le foto pro
 *  appaiono ANCHE in /admin/media insieme a tutti gli altri media. */
export async function POST(req: Request) {
  const result = await requirePermission("products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const productId = body.productId || null;
    const typology = body.typology || null;
    const projectId = body.projectId || null;
    const items: ProfImageItem[] = Array.isArray(body.items) ? body.items : [];

    if (!productId && !typology && !projectId) {
      return NextResponse.json({ success: false, error: "Specificare productId, typology o projectId" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun file" }, { status: 400 });
    }

    const created = [];
    for (const it of items) {
      if (!it.fileUrl) continue;
      const rec = await prisma.professionalImage.create({
        data: {
          productId,
          typology,
          projectId,
          fileUrl: it.fileUrl,
          fileName: it.fileName || it.fileUrl.split("/").pop() || "image",
          storage: it.fileUrl.startsWith("http") ? "wasabi" : "local",
          size: it.size || null,
          width: it.width || null,
          height: it.height || null,
        },
      });
      created.push(rec);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
