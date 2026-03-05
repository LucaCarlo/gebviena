import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const blocks = await prisma.dimensionBlock.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ success: true, data: blocks });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, labels, isActive = true, sortOrder = 0 } = body;

    if (!name || !labels) {
      return NextResponse.json({ success: false, error: "Nome e labels obbligatori" }, { status: 400 });
    }

    const block = await prisma.dimensionBlock.create({
      data: {
        name,
        labels: typeof labels === "string" ? labels : JSON.stringify(labels),
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json({ success: true, data: block });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
