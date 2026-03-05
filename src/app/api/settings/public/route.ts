import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
// Returns only non-sensitive settings for the frontend
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ["recaptcha_enabled", "recaptcha_site_key"] },
      },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      data: result,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
