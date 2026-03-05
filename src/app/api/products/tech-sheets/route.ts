import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — returns all active products that have a tech sheet PDF
export async function GET() {
  const data = await prisma.product.findMany({
    where: {
      isActive: true,
      techSheetUrl: { not: null },
    },
    select: {
      id: true,
      name: true,
      designerName: true,
      techSheetUrl: true,
    },
    orderBy: { name: "asc" },
  });

  // Filter out empty strings
  const filtered = data.filter((p) => p.techSheetUrl && p.techSheetUrl.trim() !== "");

  return NextResponse.json({ success: true, data: filtered });
}
