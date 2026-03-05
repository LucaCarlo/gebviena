import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("contacts", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { isRead } = body;

    const data = await prisma.contactSubmission.update({
      where: { id: params.id },
      data: { isRead: isRead ?? true },
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("contacts", "delete");
  if (isErrorResponse(result)) return result;

  try {
    await prisma.contactSubmission.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
