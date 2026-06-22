import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { translateFields } from "@/lib/ai-translate";

export const dynamic = "force-dynamic";

/** POST /api/admin/professional-notifications/translate
 *   Body: { title: string, body?: string }
 *   Ritorna: { success, data: { en: {title, body}, de: {...}, fr: {...}, es: {...} } }
 *   Usato dal form Bacheca admin per pre-popolare i campi tradotti. */
export async function POST(req: Request) {
  const auth = await requirePermission("newsletter", "create");
  if (isErrorResponse(auth)) return auth;

  const payload = await req.json().catch(() => ({}));
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!title) return NextResponse.json({ success: false, error: "Titolo richiesto" }, { status: 400 });

  const TARGETS = ["en", "de", "fr", "es"];
  const out: Record<string, { title: string; body: string }> = {};

  try {
    await Promise.all(TARGETS.map(async (target) => {
      try {
        const t = await translateFields({ title, body }, { fromLang: "it", toLang: target });
        out[target] = { title: t.title || "", body: t.body || "" };
      } catch (e) {
        console.error(`[bacheca-translate] target=${target}:`, e);
        out[target] = { title: "", body: "" };
      }
    }));
    return NextResponse.json({ success: true, data: out });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
