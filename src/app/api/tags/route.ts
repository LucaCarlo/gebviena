import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET - list all tags with contact count
export async function GET() {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  });

  return NextResponse.json({
    success: true,
    data: tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      count: t._count.contacts,
      createdAt: t.createdAt,
    })),
  });
}

// POST - create a new tag
export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "create");
  if (isErrorResponse(result)) return result;

  const { name, color } = await req.json();
  if (!name) {
    return NextResponse.json({ success: false, error: "Nome obbligatorio" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  try {
    const tag = await prisma.tag.create({
      data: { name, slug, color: color || "#6b7280" },
    });
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Tag già esistente" }, { status: 409 });
  }
}
