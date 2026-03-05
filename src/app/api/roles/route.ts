import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET /api/roles — List all roles
export async function GET() {
  const result = await requirePermission("roles", "view");
  if (isErrorResponse(result)) return result;

  const roles = await prisma.role.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({
    success: true,
    data: roles.map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions),
      userCount: r._count.users,
    })),
  });
}

// POST /api/roles — Create a new custom role
export async function POST(req: NextRequest) {
  const result = await requirePermission("roles", "create");
  if (isErrorResponse(result)) return result;

  const body = await req.json();
  const { name, label, permissions } = body;

  if (!name || !label) {
    return NextResponse.json(
      { success: false, error: "Nome e etichetta sono obbligatori" },
      { status: 400 }
    );
  }

  // Slugify name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await prisma.role.findUnique({ where: { name: slug } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Un ruolo con questo nome esiste già" },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.role.aggregate({ _max: { sortOrder: true } });

  const role = await prisma.role.create({
    data: {
      name: slug,
      label,
      permissions: JSON.stringify(permissions || {}),
      isSystem: false,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });

  return NextResponse.json({
    success: true,
    data: { ...role, permissions: JSON.parse(role.permissions) },
  });
}
