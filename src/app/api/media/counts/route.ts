import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET() {
  const result = await requirePermission("media", "view");
  if (isErrorResponse(result)) return result;

  const [total, groups] = await Promise.all([
    prisma.mediaFile.count(),
    prisma.mediaFile.groupBy({
      by: ["folder"],
      _count: { _all: true },
    }),
  ]);

  const byFolder: Record<string, number> = {};
  for (const g of groups) {
    byFolder[g.folder] = g._count._all;
  }

  return NextResponse.json({ success: true, data: { total, byFolder } });
}
