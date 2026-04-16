import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
    if (urls.length === 0) return NextResponse.json({ success: true, data: {} });

    const lang = req.headers.get("x-gtv-lang") || body?.lang || "it";

    const files = await prisma.mediaFile.findMany({
      where: { url: { in: urls } },
      select: {
        id: true,
        url: true,
        altText: true,
        ...(lang !== "it"
          ? { translations: { where: { languageCode: lang }, select: { altText: true } } }
          : {}),
      },
    });

    const map: Record<string, string> = {};
    for (const f of files) {
      const tr = (f as { translations?: { altText: string | null }[] }).translations?.[0];
      const alt = (lang !== "it" && tr?.altText) ? tr.altText : f.altText;
      if (alt) map[f.url] = alt;
    }
    return NextResponse.json({ success: true, data: map });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
