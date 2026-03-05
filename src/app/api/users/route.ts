import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET() {
  const result = await requirePermission("users", "view");
  if (isErrorResponse(result)) return result;

  const data = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roleId: true,
      roleRef: { select: { name: true, label: true } },
      avatar: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("users", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { password, ...rest } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: "Password richiesta" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.adminUser.create({
      data: { ...rest, passwordHash },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...data } = user;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
