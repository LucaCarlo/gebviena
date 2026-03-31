import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET - list all landing pages (admin) or get by permalink (public)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isAdmin = searchParams.get("admin") === "true";
  const permalink = searchParams.get("permalink");
  const id = searchParams.get("id");

  // Admin list
  if (isAdmin && !id && !permalink) {
    const result = await requirePermission("landing_page", "view");
    if (isErrorResponse(result)) return result;

    const data = await prisma.landingPageConfig.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { registrations: true } } },
    });
    return NextResponse.json({ success: true, data });
  }

  // Admin single by id
  if (isAdmin && id) {
    const result = await requirePermission("landing_page", "view");
    if (isErrorResponse(result)) return result;

    const config = await prisma.landingPageConfig.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: config });
  }

  // Public by permalink
  if (permalink) {
    const config = await prisma.landingPageConfig.findUnique({
      where: { permalink },
    });
    if (!config || !config.isActive) {
      return NextResponse.json({ success: false, error: "Landing page non trovata" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: config });
  }

  // Legacy: get default (backwards compat for /contatti/landing-page)
  const config = await prisma.landingPageConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: config });
}

// POST - create new landing page
export async function POST(req: Request) {
  const result = await requirePermission("landing_page", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { name, permalink, type } = body;

    if (!name || !permalink) {
      return NextResponse.json({ success: false, error: "Nome e permalink obbligatori" }, { status: 400 });
    }

    const slug = permalink.toLowerCase().replace(/[^\w-]/g, "").replace(/\s+/g, "-");

    const config = await prisma.landingPageConfig.create({
      data: {
        name,
        slug,
        permalink: slug,
        type: type || "evento",
        heroTitle: name,
        buttonLabel: "Register",
      },
    });

    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch (e) {
    const msg = String(e).includes("Unique") ? "Permalink già in uso" : "Errore server";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// PUT - update landing page
export async function PUT(req: Request) {
  const result = await requirePermission("landing_page", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID obbligatorio" }, { status: 400 });
    }

    // If permalink changed, update slug too
    if (fields.permalink) {
      fields.slug = fields.permalink.toLowerCase().replace(/[^\w-]/g, "").replace(/\s+/g, "-");
      fields.permalink = fields.slug;
    }

    const config = await prisma.landingPageConfig.update({
      where: { id },
      data: fields,
    });

    return NextResponse.json({ success: true, data: config });
  } catch (e) {
    const msg = String(e).includes("Unique") ? "Permalink già in uso" : "Errore server";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// DELETE - delete landing page
export async function DELETE(req: Request) {
  const result = await requirePermission("landing_page", "delete");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID obbligatorio" }, { status: 400 });

  await prisma.landingPageConfig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
