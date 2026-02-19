import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path: pagePath, referrer, userAgent } = body;

    if (!pagePath) {
      return NextResponse.json({ success: false, error: "Path richiesto" }, { status: 400 });
    }

    const data = await prisma.pageView.create({
      data: {
        path: pagePath,
        referrer: referrer || null,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
