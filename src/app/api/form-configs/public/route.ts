import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface FormField {
  key: string;
  label: string;
  placeholder?: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

export async function GET(req: NextRequest) {
  const formType = req.nextUrl.searchParams.get("type");
  const lang = req.headers.get("x-gtv-lang") || req.nextUrl.searchParams.get("lang") || "it";

  if (!formType) {
    return NextResponse.json({ success: false, error: "type parameter required" }, { status: 400 });
  }

  const config = await prisma.formConfig.findUnique({
    where: { formType },
    include: lang !== "it"
      ? { translations: { where: { languageCode: lang } } }
      : undefined,
  });
  if (!config) {
    return NextResponse.json({ success: true, data: [] });
  }

  const allFields = JSON.parse(config.fields) as FormField[];
  let translatedFields = allFields;

  const cfg = config as typeof config & { translations?: { fields: string }[] };
  if (lang !== "it" && cfg.translations && cfg.translations.length > 0) {
    try {
      const trFields = JSON.parse(cfg.translations[0].fields) as FormField[];
      const byKey = new Map(trFields.map((f) => [f.key, f]));
      translatedFields = allFields.map((f) => {
        const tr = byKey.get(f.key);
        return tr ? { ...f, label: tr.label || f.label, placeholder: tr.placeholder ?? f.placeholder } : f;
      });
    } catch { /* fallback to default */ }
  }

  const enabledFields = translatedFields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  return NextResponse.json({ success: true, data: enabledFields });
}
