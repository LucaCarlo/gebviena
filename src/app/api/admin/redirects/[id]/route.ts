import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { validateDestinationPath } from "@/lib/path-validator";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;
  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (typeof body.fromPath === "string" && body.fromPath.trim()) {
      if (!body.fromPath.startsWith("/")) {
        return NextResponse.json({ success: false, error: "fromPath deve iniziare con /" }, { status: 400 });
      }
      update.fromPath = body.fromPath.trim();
    }
    if (typeof body.toPath === "string" && body.toPath.trim()) {
      const validation = await validateDestinationPath(body.toPath.trim());
      if (!validation.ok) {
        return NextResponse.json({ success: false, error: `Destinazione non valida: ${validation.reason}` }, { status: 400 });
      }
      update.toPath = body.toPath.trim();
    }
    if (typeof body.statusCode === "number") update.statusCode = body.statusCode === 302 ? 302 : 301;
    if (typeof body.enabled === "boolean") update.enabled = body.enabled;
    if (typeof body.note === "string") update.note = body.note || null;
    const data = await prisma.redirect.update({ where: { id: params.id }, data: update });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;
  try {
    await prisma.redirect.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
