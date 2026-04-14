import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { translateText, translateFields } from "@/lib/ai-translate";

export async function POST(req: NextRequest) {
  const result = await requirePermission("settings", "view");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { text, fields, fromLang, toLang, htmlMode } = body as {
      text?: string;
      fields?: Record<string, string>;
      fromLang: string;
      toLang: string;
      htmlMode?: boolean;
    };

    if (!fromLang || !toLang) {
      return NextResponse.json({ success: false, error: "fromLang e toLang obbligatori" }, { status: 400 });
    }

    if (fields && typeof fields === "object") {
      const translations = await translateFields(fields, { fromLang, toLang, htmlMode });
      return NextResponse.json({ success: true, translations });
    }

    if (typeof text === "string") {
      const translation = await translateText(text, { fromLang, toLang, htmlMode });
      return NextResponse.json({ success: true, translation });
    }

    return NextResponse.json({ success: false, error: "Fornisci 'text' o 'fields'" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
