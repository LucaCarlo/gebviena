import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { validateDestinationPath } from "@/lib/path-validator";

export async function GET() {
  const result = await requirePermission("settings", "view");
  if (isErrorResponse(result)) return result;
  const redirects = await prisma.redirect.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: redirects });
}

export async function POST(req: NextRequest) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;
  try {
    const body = await req.json();
    const fromPath = (body.fromPath || "").trim();
    const toPath = (body.toPath || "").trim();
    const statusCode = body.statusCode === 302 ? 302 : 301;
    const enabled = body.enabled !== false;
    const note = body.note ? String(body.note) : null;

    if (!fromPath || !fromPath.startsWith("/")) {
      return NextResponse.json({ success: false, error: "fromPath deve iniziare con /" }, { status: 400 });
    }
    if (fromPath === toPath) {
      return NextResponse.json({ success: false, error: "Origine e destinazione coincidono" }, { status: 400 });
    }
    const validation = await validateDestinationPath(toPath);
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: `Destinazione non valida: ${validation.reason}` }, { status: 400 });
    }
    const data = await prisma.redirect.create({
      data: { fromPath, toPath, statusCode, enabled, note },
    });
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Esiste già un redirect per questo path" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
