import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: active attribute values grouped by type (for filters)
export async function GET() {
  const values = await prisma.storeAttributeValue.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      type: true,
      code: true,
      hexColor: true,
      translations: { select: { languageCode: true, label: true } },
    },
  });

  return NextResponse.json({ success: true, data: values });
}
