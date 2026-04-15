import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
    if (urls.length === 0) return NextResponse.json({ success: true, data: {} });

    const files = await prisma.mediaFile.findMany({
      where: { url: { in: urls } },
      select: { url: true, altText: true },
    });

    const map: Record<string, string> = {};
    for (const f of files) {
      if (f.altText) map[f.url] = f.altText;
    }
    return NextResponse.json({ success: true, data: map });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
