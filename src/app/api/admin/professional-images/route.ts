import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { isS3Configured, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const result = await requirePermission("products", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const typology = searchParams.get("typology");
  // Modalità "summary": ritorna conteggi aggregati per typology o productId
  // — utile per la dashboard tab Media (badge counter per tipologia/prodotto).
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };
  if (productId) where.productId = productId;
  if (typology) where.typology = typology;
  // Se sia productId che typology sono assenti, ritorna lista completa (max 500)
  const rows = await prisma.professionalImage.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: Request) {
  const result = await requirePermission("products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const formData = await req.formData();
    const productId = (formData.get("productId") as string) || null;
    const typology = (formData.get("typology") as string) || null;
    if (!productId && !typology) {
      return NextResponse.json(
        { success: false, error: "Specificare productId o typology" },
        { status: 400 },
      );
    }
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun file" }, { status: 400 });
    }

    const useS3 = await isS3Configured();
    const created = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const key = `professionals/${productId || `typology-${typology}`}/${stamp}-${safeName}`;

      let fileUrl: string;
      let storage: string;
      if (useS3) {
        fileUrl = await uploadToS3(buffer, key, file.type || "image/jpeg");
        storage = "wasabi";
      } else {
        const localDir = path.join(process.cwd(), "public", "uploads", "professionals", productId || `typology-${typology}`);
        await mkdir(localDir, { recursive: true });
        const localName = `${stamp}-${safeName}`;
        await writeFile(path.join(localDir, localName), buffer);
        fileUrl = `/uploads/professionals/${productId || `typology-${typology}`}/${localName}`;
        storage = "local";
      }

      const rec = await prisma.professionalImage.create({
        data: {
          productId,
          typology,
          fileUrl,
          fileName: file.name,
          storage,
          size: buffer.length,
        },
      });
      created.push(rec);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
