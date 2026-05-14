import { NextRequest, NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/customer-magic-link";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/public/auth/request-magic-link
 * Body: { email: string, purpose?: "magic_link" | "password_reset" }
 *
 * Risponde SEMPRE 200 { success: true } anche se l'email non esiste, per
 * evitare email-enumeration. L'invio reale avviene solo se il customer
 * esiste ed è attivo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const purpose = body.purpose === "password_reset" ? "password_reset" : "magic_link";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    await requestMagicLink({ email, origin, purpose }).catch((err) => {
      console.error("[request-magic-link] error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[request-magic-link] handler error:", e);
    // Restituiamo comunque 200 — l'utente non deve sapere se è andata o no.
    return NextResponse.json({ success: true });
  }
}
