import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_REASONS = ["Informazioni prodotti", "Richiesta preventivo", "Collaborazione", "Altro"];

export async function GET() {
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
