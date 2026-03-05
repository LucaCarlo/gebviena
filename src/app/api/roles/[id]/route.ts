import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET /api/roles/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("roles", "view");
  if (isErrorResponse(result)) return result;

  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    return NextResponse.json(
      { success: false, error: "Ruolo non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...role,
      permissions: JSON.parse(role.permissions),
      userCount: role._count.users,
    },
  });
}

// PUT /api/roles/:id — Update role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("roles", "edit");
  if (isErrorResponse(result)) return result;

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    return NextResponse.json(
      { success: false, error: "Ruolo non trovato" },
      { status: 404 }
    );
  }

  // Cannot edit superadmin unless you are superadmin
  if (role.name === "superadmin" && result.roleName !== "superadmin") {
    return NextResponse.json(
      { success: false, error: "Solo i superadmin possono modificare il ruolo superadmin" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // System roles: can update permissions but not name
  if (!role.isSystem && body.label !== undefined) {
    data.label = body.label;
  }
  if (body.permissions !== undefined) {
    data.permissions = JSON.stringify(body.permissions);
  }
  if (!role.isSystem && body.label !== undefined) {
    data.label = body.label;
  }

  const updated = await prisma.role.update({ where: { id }, data });

  return NextResponse.json({
    success: true,
    data: { ...updated, permissions: JSON.parse(updated.permissions) },
  });
}

// DELETE /api/roles/:id — Delete custom role
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("roles", "delete");
  if (isErrorResponse(result)) return result;

  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    return NextResponse.json(
      { success: false, error: "Ruolo non trovato" },
      { status: 404 }
    );
  }

  if (role.isSystem) {
    return NextResponse.json(
      { success: false, error: "Non puoi eliminare un ruolo di sistema" },
      { status: 400 }
    );
  }

  if (role._count.users > 0) {
    return NextResponse.json(
      { success: false, error: `Ci sono ${role._count.users} utenti assegnati a questo ruolo. Riassegnali prima di eliminarlo.` },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
