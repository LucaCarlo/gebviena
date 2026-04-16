import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
// Returns only non-sensitive settings for the frontend
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          { key: { in: ["recaptcha_enabled", "recaptcha_site_key"] } },
          { group: "social" },
          { group: "maps" },
        ],
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
        // Settings change rarely but when they do (admin toggle Maps provider,
        // social URLs, recaptcha key) the change must be visible immediately.
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
