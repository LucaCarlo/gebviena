import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

const PRO_FOLDER_PREFIXES = [
  "professionals", "tech-sheets", "catalogs",
  "listini-prezzi", "press-kit", "informazioni-tecniche",
  "pdf-listini-prezzi", "pdf-press-kit", "pdf-informazioni-tecniche",
];

export async function GET() {
  const result = await requirePermission("media", "view");
  if (isErrorResponse(result)) return result;

  const [total, groups, proCount] = await Promise.all([
    prisma.mediaFile.count(),
    prisma.mediaFile.groupBy({
      by: ["folder"],
      _count: { _all: true },
    }),
    // Count cumulativo dei file in cartelle Professionisti (prefix match)
    prisma.mediaFile.count({
      where: {
        OR: PRO_FOLDER_PREFIXES.map((f) => ({ folder: { startsWith: f } })),
      },
    }),
  ]);

  const byFolder: Record<string, number> = {};
  for (const g of groups) {
    byFolder[g.folder] = g._count._all;
  }
  // Aggrega anche per le voci canoniche di MEDIA_FOLDERS quando le cartelle
  // sono salvate con sotto-percorsi (es. "professionals/tip-SEDUTE"): facciamo
  // un rollup per la prima parte del path.
  for (const g of groups) {
    const root = g.folder.split("/")[0];
    if (root !== g.folder) {
      byFolder[root] = (byFolder[root] || 0) + g._count._all;
    }
  }
  byFolder["__pro__"] = proCount;

  return NextResponse.json({ success: true, data: { total, byFolder } });
}
