import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { listTranslations, getEntityDef, loadSourceText } from "@/lib/translation-entities";

export async function GET(req: NextRequest, { params }: { params: { entity: string; id: string } }) {
  const result = await requirePermission("settings", "view");
  if (isErrorResponse(result)) return result;

  const def = getEntityDef(params.entity);
  if (!def) return NextResponse.json({ success: false, error: "Entity sconosciuta" }, { status: 400 });

  try {
    const [data, source] = await Promise.all([
      listTranslations(params.entity, params.id),
      loadSourceText(params.entity, params.id),
    ]);
    return NextResponse.json({ success: true, data, source, fields: def.fields });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
