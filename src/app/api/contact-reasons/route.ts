import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const DEFAULT_REASONS = ["Informazioni prodotti", "Richiesta preventivo", "Collaborazione", "Altro"];

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: "contact_reasons" } });
  if (!setting) {
    return NextResponse.json({ success: true, data: DEFAULT_REASONS });
  }

  try {
    return NextResponse.json({ success: true, data: JSON.parse(setting.value) });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_REASONS });
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  try {
    const { reasons } = await req.json();
    if (!Array.isArray(reasons)) {
      return NextResponse.json({ success: false, error: "reasons deve essere un array" }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: "contact_reasons" },
      update: { value: JSON.stringify(reasons) },
      create: { key: "contact_reasons", value: JSON.stringify(reasons), group: "forms" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
