import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { syncBlocks, safeParseBlocks } from "@/lib/news-block-sync";

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || `news-${Date.now()}`;
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const existing = await prisma.newsArticle.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.newsArticle.findUnique({ where: { id: params.id } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("news", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    // Fallback slug se vuoto: rigenera dal titolo (o mantiene quello in DB).
    if (typeof body.slug !== "undefined") {
      const slugInput = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!slugInput) {
        const titleInput = typeof body.title === "string" ? body.title.trim() : "";
        const current = await prisma.newsArticle.findUnique({ where: { id: params.id }, select: { slug: true, title: true } });
        const base = titleInput ? slugify(titleInput) : (current?.slug || slugify(current?.title || ""));
        body.slug = await ensureUniqueSlug(base, params.id);
      }
    }
    const data = await prisma.newsArticle.update({ where: { id: params.id }, data: body });

    // Se abbiamo aggiornato i blocks del master, sincronizza i campi non-linguistici
    // in tutte le traduzioni (mantiene testi tradotti, aggiorna config/immagini/ctas/etc).
    if (typeof body.blocks === "string" && body.blocks.length > 0) {
      try {
        const masterBlocks = safeParseBlocks(body.blocks);
        if (masterBlocks && masterBlocks.length > 0) {
          const translations = await prisma.newsArticleTranslation.findMany({
            where: { newsArticleId: params.id },
            select: { id: true, blocks: true },
          });
          for (const tr of translations) {
            const transBlocks = safeParseBlocks(tr.blocks);
            if (!transBlocks || transBlocks.length === 0) continue;
            const synced = syncBlocks(masterBlocks, transBlocks);
            const syncedStr = JSON.stringify(synced);
            if (syncedStr !== tr.blocks) {
              await prisma.newsArticleTranslation.update({
                where: { id: tr.id },
                data: { blocks: syncedStr },
              });
            }
          }
        }
      } catch (e) {
        console.error("[news-block-sync] hook error:", e);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("news", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.newsArticle.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
