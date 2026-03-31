import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";

// GET - list all templates
export async function GET() {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const data = await prisma.emailTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, data });
}

// POST - create template
export async function POST(req: Request) {
  const result = await requirePermission("email_templates", "create");
  if (isErrorResponse(result)) return result;

  try {
    const { name, subject, blocks } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: "Nome obbligatorio" }, { status: 400 });

    const blocksJson = typeof blocks === "string" ? blocks : JSON.stringify(blocks || []);
    const previewHtml = renderEmailTemplate(parseBlocks(blocksJson), {
      firstName: "Mario", lastName: "Rossi", email: "mario@esempio.com", eventLink: "#",
    });

    const template = await prisma.emailTemplate.create({
      data: { name, subject: subject || "", blocks: blocksJson, previewHtml },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
