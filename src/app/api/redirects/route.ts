import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint used by middleware. No auth.
// Returns only enabled redirects, minimal fields.
export async function GET() {
  const data = await prisma.redirect.findMany({
    where: { enabled: true },
    select: { fromPath: true, toPath: true, statusCode: true },
  });
  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}

// Internal POST to bump hits counter (called by middleware as fire-and-forget)
export async function POST(req: Request) {
  try {
    const { fromPath } = await req.json();
    if (typeof fromPath !== "string") return NextResponse.json({ success: false }, { status: 400 });
    await prisma.redirect.updateMany({
      where: { fromPath, enabled: true },
      data: { hits: { increment: 1 }, lastHitAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
