import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

const DEFAULTS: Record<string, { key: string; label: string; type: string; required: boolean; enabled: boolean; order: number }[]> = {
  info_request: [
    { key: "name", label: "Nome e Cognome", type: "text", required: true, enabled: true, order: 0 },
    { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 1 },
    { key: "company", label: "Azienda", type: "text", required: false, enabled: true, order: 2 },
    { key: "phone", label: "Telefono", type: "tel", required: false, enabled: true, order: 3 },
    { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: true, order: 4 },
    { key: "subject", label: "Oggetto", type: "text", required: false, enabled: true, order: 5 },
    { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 6 },
    { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 7 },
    { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 8 },
  ],
  store_contact: [
    { key: "name", label: "Nome", type: "text", required: true, enabled: true, order: 0 },
    { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 1 },
    { key: "company", label: "Azienda", type: "text", required: false, enabled: false, order: 2 },
    { key: "phone", label: "Telefono", type: "tel", required: false, enabled: false, order: 3 },
    { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: true, order: 4 },
    { key: "subject", label: "Oggetto", type: "text", required: false, enabled: false, order: 5 },
    { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 6 },
    { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 7 },
    { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: false, order: 8 },
  ],
  newsletter: [
    { key: "firstName", label: "Nome", type: "text", required: true, enabled: true, order: 0 },
    { key: "lastName", label: "Cognome", type: "text", required: true, enabled: true, order: 1 },
    { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 2 },
    { key: "company", label: "Azienda", type: "text", required: false, enabled: false, order: 3 },
    { key: "phone", label: "Telefono", type: "tel", required: false, enabled: false, order: 4 },
    { key: "acceptsPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: false, enabled: true, order: 5 },
    { key: "acceptsUpdates", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 6 },
  ],
  collaboration: [
    { key: "name", label: "Nome e Cognome", type: "text", required: true, enabled: true, order: 0 },
    { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 1 },
    { key: "company", label: "Azienda / Studio", type: "text", required: false, enabled: true, order: 2 },
    { key: "phone", label: "Telefono", type: "tel", required: false, enabled: true, order: 3 },
    { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: false, order: 4 },
    { key: "subject", label: "Oggetto", type: "text", required: false, enabled: false, order: 5 },
    { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 6 },
    { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 7 },
    { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 8 },
  ],
};

async function ensureDefaults() {
  for (const [formType, defaultFields] of Object.entries(DEFAULTS)) {
    const existing = await prisma.formConfig.findUnique({ where: { formType } });
    if (!existing) {
      await prisma.formConfig.create({
        data: { formType, fields: JSON.stringify(defaultFields) },
      });
    } else {
      // Merge missing fields into existing config
      try {
        const existingFields = JSON.parse(existing.fields) as { key: string; order: number }[];
        const existingKeys = new Set(existingFields.map((f) => f.key));
        const missingFields = defaultFields.filter((f) => !existingKeys.has(f.key));
        if (missingFields.length > 0) {
          const maxOrder = Math.max(...existingFields.map((f) => f.order ?? 0), -1);
          const merged = [
            ...existingFields,
            ...missingFields.map((f, i) => ({ ...f, order: maxOrder + 1 + i })),
          ];
          await prisma.formConfig.update({
            where: { formType },
            data: { fields: JSON.stringify(merged) },
          });
        }
      } catch { /* skip if parse fails */ }
    }
  }
}

export async function GET() {
  const result = await requirePermission("forms", "view");
  if (isErrorResponse(result)) return result;

  await ensureDefaults();
  const data = await prisma.formConfig.findMany({ orderBy: { formType: "asc" } });
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request) {
  const result = await requirePermission("forms", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { formType, fields } = body;

    if (!formType || !Array.isArray(fields)) {
      return NextResponse.json({ success: false, error: "formType e fields richiesti" }, { status: 400 });
    }

    const data = await prisma.formConfig.upsert({
      where: { formType },
      update: { fields: JSON.stringify(fields) },
      create: { formType, fields: JSON.stringify(fields) },
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
