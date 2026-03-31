import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";

// GET - single template
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const template = await prisma.emailTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  return NextResponse.json({ success: true, data: template });
}

// PUT - update template
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("email_templates", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { name, subject, blocks, isActive } = await req.json();
    const blocksJson = typeof blocks === "string" ? blocks : JSON.stringify(blocks || []);
    const previewHtml = renderEmailTemplate(parseBlocks(blocksJson), {
      firstName: "Mario", lastName: "Rossi", email: "mario@esempio.com", eventLink: "#",
    });

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        blocks: blocksJson,
        previewHtml,
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch {
    return NextResponse.json({ success: false, error: "Errore aggiornamento" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("email_templates", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.emailTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
