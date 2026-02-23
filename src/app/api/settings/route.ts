import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group");

  const where: Record<string, unknown> = {};
  if (group) where.group = group;

  const settings = await prisma.setting.findMany({ where });

  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { settings } = body as { settings: { key: string; value: string; group: string }[] };

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ success: false, error: "Campo 'settings' mancante o non valido" }, { status: 400 });
    }

    const results = [];
    for (const s of settings) {
      const result = await prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value, group: s.group },
        create: { key: s.key, value: s.value, group: s.group },
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
