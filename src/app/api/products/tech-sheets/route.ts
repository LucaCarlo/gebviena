import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — prodotti attivi con almeno un documento tecnico.
// Esclude varianti commerciali (`category` "verniciature-..." o vuoto): non
// sono prodotti tecnici a sé, sono custom della famiglia base (es. "MOS BENCH
// con cuscino corto" è una variante di MOS BENCH, non un prodotto separato).
export async function GET() {
  const data = await prisma.product.findMany({
    where: { isActive: true, excludeFromCatalog: false },
    select: {
      id: true,
      name: true,
      designerName: true,
      techSheetUrl: true,
      model2dUrl: true,
      model3dUrl: true,
      instructionsUrl: true,
      careUrl: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });

  const filtered = data.filter((p) => {
    const cat = (p.category || "").trim();
    if (!cat) return false;
    if (cat.toLowerCase().startsWith("verniciature")) return false;
    const hasDoc =
      (p.techSheetUrl && p.techSheetUrl.trim() !== "") ||
      (p.model2dUrl && p.model2dUrl.trim() !== "") ||
      (p.model3dUrl && p.model3dUrl.trim() !== "") ||
      (p.instructionsUrl && p.instructionsUrl.trim() !== "") ||
      (p.careUrl && p.careUrl.trim() !== "");
    return hasDoc;
  });

  return NextResponse.json({ success: true, data: filtered });
}
