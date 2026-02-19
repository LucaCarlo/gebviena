import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const country = searchParams.get("country");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { isActive: true };
  if (type) where.type = type;
  if (country) where.country = country;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { city: { contains: search } },
      { address: { contains: search } },
    ];
  }

  const data = await prisma.pointOfSale.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await prisma.pointOfSale.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
