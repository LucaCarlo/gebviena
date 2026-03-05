import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const formType = req.nextUrl.searchParams.get("type");
  if (!formType) {
    return NextResponse.json({ success: false, error: "type parameter required" }, { status: 400 });
  }

  const config = await prisma.formConfig.findUnique({ where: { formType } });
  if (!config) {
    return NextResponse.json({ success: true, data: [] });
  }

  const allFields = JSON.parse(config.fields) as { key: string; label: string; type: string; required: boolean; enabled: boolean; order: number }[];
  const enabledFields = allFields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  return NextResponse.json({ success: true, data: enabledFields });
}
