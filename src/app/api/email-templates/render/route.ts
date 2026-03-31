import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { renderEmailTemplate, type EmailBlock } from "@/lib/email-template-renderer";

export async function POST(req: Request) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const { blocks, variables } = await req.json();
  const parsedBlocks: EmailBlock[] = typeof blocks === "string" ? JSON.parse(blocks) : blocks;

  const html = renderEmailTemplate(parsedBlocks, {
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@esempio.com",
    eventLink: "https://dev.gebruederthonetvienna.com/contatti/landing-page",
    ...variables,
  });

  return NextResponse.json({ success: true, html });
}
