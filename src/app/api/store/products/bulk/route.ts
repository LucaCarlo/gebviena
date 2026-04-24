import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

type BulkAction = "publish" | "unpublish" | "delete";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as BulkAction;
  const ids = Array.isArray(body.ids) ? (body.ids as string[]).filter(Boolean) : [];

  if (!ids.length) {
    return NextResponse.json({ success: false, error: "Nessun prodotto selezionato" }, { status: 400 });
  }

  // Permessi diversi per azione
  const needed = action === "delete" ? "delete" : "edit";
  const result = await requirePermission("store_products", needed);
  if (isErrorResponse(result)) return result;

  try {
    let affected = 0;

    if (action === "publish") {
      const r = await prisma.storeProduct.updateMany({
        where: { id: { in: ids } },
        data: { isPublished: true, publishedAt: new Date() },
      });
      affected = r.count;
    } else if (action === "unpublish") {
      const r = await prisma.storeProduct.updateMany({
        where: { id: { in: ids } },
        data: { isPublished: false },
      });
      affected = r.count;
    } else if (action === "delete") {
      const r = await prisma.storeProduct.deleteMany({ where: { id: { in: ids } } });
      affected = r.count;
    } else {
      return NextResponse.json({ success: false, error: "Azione non valida" }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
