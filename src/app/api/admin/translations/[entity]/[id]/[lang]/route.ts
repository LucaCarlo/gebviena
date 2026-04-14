import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { upsertTranslation, getEntityDef } from "@/lib/translation-entities";

export async function PUT(
  req: NextRequest,
  { params }: { params: { entity: string; id: string; lang: string } }
) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  const def = getEntityDef(params.entity);
  if (!def) return NextResponse.json({ success: false, error: "Entity sconosciuta" }, { status: 400 });

  try {
    const body = await req.json();
    const data = await upsertTranslation(params.entity, params.id, params.lang, body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
