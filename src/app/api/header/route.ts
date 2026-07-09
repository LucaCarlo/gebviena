import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HeaderMenuItem } from "@/lib/header-menu-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/header — restituisce il menu header configurato dall'admin (JSON tree).
 * Se non esiste ancora nessuna configurazione (setup fresco), ritorna `{success:true, data:null}`
 * e il MobileMenu usa il fallback statico da constants.ts.
 */
export async function GET() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "header.menu" } });
    if (!s || !s.value) {
      return NextResponse.json({ success: true, data: null });
    }
    let parsed: HeaderMenuItem[] | null = null;
    try { parsed = JSON.parse(s.value) as HeaderMenuItem[]; } catch { parsed = null; }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data: parsed });
  } catch (e) {
    console.error("[api/header] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
