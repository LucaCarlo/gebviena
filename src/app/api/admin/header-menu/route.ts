import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import type { HeaderMenuItem } from "@/lib/header-menu-types";

export const dynamic = "force-dynamic";

/** GET admin — ritorna il menu configurato (JSON tree). Se manca ritorna array vuoto. */
export async function GET() {
  const auth = await requirePermission("settings", "view");
  if (isErrorResponse(auth)) return auth;

  const s = await prisma.setting.findUnique({ where: { key: "header.menu" } });
  let data: HeaderMenuItem[] = [];
  if (s?.value) {
    try {
      const parsed = JSON.parse(s.value);
      if (Array.isArray(parsed)) data = parsed;
    } catch { /* ignore */ }
  }
  return NextResponse.json({ success: true, data });
}

function sanitize(node: unknown, depth = 0): HeaderMenuItem | null {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const id = typeof n.id === "string" && n.id.trim() ? n.id.trim().slice(0, 64) : `item-${Math.random().toString(36).slice(2, 10)}`;
  const labelsRaw = (n.labels && typeof n.labels === "object") ? n.labels as Record<string, unknown> : {};
  const labels: Record<string, string> = {};
  for (const [k, v] of Object.entries(labelsRaw)) {
    if (typeof v === "string" && v.trim()) labels[k] = v.trim().slice(0, 128);
  }
  // Se non c'e' un IT non blocchiamo — il frontend cade in fallback statico se
  // il salvataggio produce un menu incompleto.
  const href = typeof n.href === "string" ? n.href.trim().slice(0, 500) : "/";
  const external = !!n.external;
  const isActive = n.isActive !== false;
  const children: HeaderMenuItem[] = [];
  if (Array.isArray(n.children) && depth < 2) {
    for (const c of n.children) {
      const sc = sanitize(c, depth + 1);
      if (sc) children.push(sc);
    }
  }
  return { id, labels, href, external, isActive, children: children.length > 0 ? children : undefined };
}

/** PUT admin — sostituisce completamente il menu con il body ricevuto (array di top-level items). */
export async function PUT(req: Request) {
  const auth = await requirePermission("settings", "edit");
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : null;
    if (!items) {
      return NextResponse.json({ success: false, error: "Formato non valido: attesa array di voci" }, { status: 400 });
    }
    const cleaned: HeaderMenuItem[] = [];
    for (const it of items) {
      const s = sanitize(it);
      if (s) cleaned.push(s);
    }

    await prisma.setting.upsert({
      where: { key: "header.menu" },
      update: { value: JSON.stringify(cleaned), group: "header" },
      create: { key: "header.menu", value: JSON.stringify(cleaned), group: "header" },
    });

    return NextResponse.json({ success: true, count: cleaned.length });
  } catch (e) {
    console.error("[admin/header-menu] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
