export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.fabricFinishCategory.findMany({
    where: { isPublished: true },
    include: {
      files: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ success: true, data });
}
