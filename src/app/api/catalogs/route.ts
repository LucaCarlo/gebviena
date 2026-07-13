import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const requestedAdmin = searchParams.get("admin") === "true" || searchParams.get("all") !== null;
  const isAdmin = requestedAdmin && (await getAuthUser()) !== null;

  const where: Record<string, unknown> = {};
  if (!isAdmin) where.isActive = true;
  if (section) where.section = section;

  // Lingua: lato pubblico la risolviamo dal header x-gtv-lang (impostato dal
  // middleware via URL prefix /fr, /en, ecc.). Override possibile con ?lang=.
  // In admin saltiamo la merge: l'admin deve sempre vedere il master IT.
  const qLang = (searchParams.get("lang") || "").toLowerCase();
  const headerLang = (req.headers.get("x-gtv-lang") || "").toLowerCase();
  const lang = qLang || headerLang || "it";
  const wantTranslation = !isAdmin && lang !== "it" && /^[a-z]{2}$/.test(lang);

  const data = await prisma.catalog.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: wantTranslation
      ? { translations: { where: { languageCode: lang }, take: 1 } }
      : undefined,
  });

  if (!wantTranslation) {
    return NextResponse.json({ success: true, data });
  }

  // Sostituisce i campi tradotti quando presenti (fallback al master IT).
  const resolved = data.map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyC = c as any;
    const tr = anyC.translations?.[0];
    const { translations: _t, ...rest } = anyC;
    void _t;
    return {
      ...rest,
      name: tr?.name?.trim() || c.name,
      title: (tr?.title && tr.title.trim()) || c.title,
      description: (tr?.description && tr.description.trim()) || c.description,
      pretitle: (tr?.pretitle && tr.pretitle.trim()) || c.pretitle,
      linkText: (tr?.linkText && tr.linkText.trim()) || c.linkText,
    };
  });

  return NextResponse.json({ success: true, data: resolved });
}

export async function POST(req: Request) {
  const result = await requirePermission("catalogs", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.catalog.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
