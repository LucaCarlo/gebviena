import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/email-templates/:id/translations
 * Ritorna tutte le traduzioni esistenti per il template.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const template = await prisma.emailTemplate.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!template) return NextResponse.json({ success: false, error: "Template non trovato" }, { status: 404 });

  const translations = await prisma.emailTemplateTranslation.findMany({
    where: { templateId: params.id },
    select: { languageCode: true, subject: true, blocks: true, updatedAt: true },
  });
  return NextResponse.json({ success: true, data: translations });
}
