import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";

// GET - render preview HTML
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const template = await prisma.emailTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  const html = renderEmailTemplate(parseBlocks(template.blocks), {
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@esempio.com",
    eventLink: "https://dev.gebruederthonetvienna.com/contatti/landing-page",
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
