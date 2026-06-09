import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const requestedAdmin = searchParams.get("admin") === "true" || searchParams.get("all") !== null;
  const isAdmin = requestedAdmin && (await getAuthUser()) !== null;

  const where: Record<string, unknown> = {};
  if (!isAdmin) where.isActive = true;
  if (section) where.section = section;

  const data = await prisma.catalog.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("catalogs", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.catalog.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
