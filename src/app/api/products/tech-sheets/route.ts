import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — returns all active products that have a tech sheet PDF
export async function GET() {
  const data = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      designerName: true,
      techSheetUrl: true,
      model2dUrl: true,
      model3dUrl: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });

  // Keep products that have at least one downloadable resource
  const filtered = data.filter(
    (p) =>
      (p.techSheetUrl && p.techSheetUrl.trim() !== "") ||
      (p.model2dUrl && p.model2dUrl.trim() !== "") ||
      (p.model3dUrl && p.model3dUrl.trim() !== ""),
  );

  return NextResponse.json({ success: true, data: filtered });
}
