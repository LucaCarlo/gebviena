import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const permResult = await requirePermission("users", "view");
  if (isErrorResponse(permResult)) return permResult;

  const user = await prisma.adminUser.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...data } = user;
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("users", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { password, ...rest } = body;

    const updateData: Record<string, unknown> = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.adminUser.update({
      where: { id: params.id },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...data } = user;
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("users", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.adminUser.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
