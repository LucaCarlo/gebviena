import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roleId: true,
      isActive: true,
      roleRef: {
        select: { name: true, label: true, permissions: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "Utente non trovato" }, { status: 404 });
  }

  let permissions: Record<string, boolean> = {};
  let roleName = user.role;
  let roleLabel = user.role;

  if (user.roleRef) {
    roleName = user.roleRef.name;
    roleLabel = user.roleRef.label;
    try {
      permissions = JSON.parse(user.roleRef.permissions);
    } catch {
      permissions = {};
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleName,
      roleLabel,
      permissions,
    },
  });
}
