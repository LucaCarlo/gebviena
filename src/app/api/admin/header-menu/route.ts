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
  // Guardia forte: IT vuoto = voce corrotta. Il caller (validate) rifiuta l'intero salvataggio.
  const href = typeof n.href === "string" ? n.href.trim().slice(0, 500) : "/";
  const external = !!n.external;
  const isActive = n.isActive !== false;
  const children: HeaderMenuItem[] = [];
  if (Array.isArray(n.children) && depth < 3) {
    for (const c of n.children) {
      const sc = sanitize(c, depth + 1);
      if (sc) children.push(sc);
    }
  }
  return { id, labels, href, external, isActive, children: children.length > 0 ? children : undefined };
}

/** Ricorsivo — ritorna la lista dei path-string delle voci con labels.it vuoto. */
function findEmptyLabels(items: HeaderMenuItem[], prefix = ""): string[] {
  const bad: string[] = [];
  items.forEach((it, i) => {
    const here = prefix ? `${prefix}.${i}` : `${i}`;
    if (!it.labels?.it || !it.labels.it.trim()) bad.push(here + ` (id=${it.id})`);
    if (it.children && it.children.length > 0) bad.push(...findEmptyLabels(it.children, here));
  });
  return bad;
}

/** PUT admin — sostituisce completamente il menu.
 *  Protezioni:
 *  - Prima di scrivere, fa BACKUP dello stato attuale in `header.menu.backup`.
 *  - RIFIUTA con 400 se ci sono voci con labels.it vuoto (evita distruzione accidentale).
 */
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

    // Validazione: rifiuta se qualche voce ha labels.it vuoto — indice di corruzione o dimenticanza
    const empty = findEmptyLabels(cleaned);
    if (empty.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Salvataggio rifiutato: ${empty.length} voce/i senza etichetta italiana. Compila IT prima di salvare. Voci: ${empty.slice(0, 5).join(", ")}${empty.length > 5 ? "…" : ""}`,
      }, { status: 400 });
    }
    // Guardia: se il payload accorcia il menu di piu' del 50% rispetto al vecchio, richiediamo conferma esplicita
    const prev = await prisma.setting.findUnique({ where: { key: "header.menu" } });
    let prevCount = 0;
    if (prev?.value) {
      try {
        const prevTree = JSON.parse(prev.value);
        if (Array.isArray(prevTree)) {
          const count = (arr: unknown[]): number => arr.reduce<number>((a, x) => a + 1 + (x && typeof x === "object" && Array.isArray((x as { children?: unknown[] }).children) ? count((x as { children: unknown[] }).children) : 0), 0);
          prevCount = count(prevTree);
        }
      } catch { /* ignore */ }
    }
    const countNew = (arr: HeaderMenuItem[]): number => arr.reduce((a, x) => a + 1 + (x.children ? countNew(x.children) : 0), 0);
    const newCount = countNew(cleaned);
    const confirmed = !!body?.confirmShrink;
    if (prevCount > 6 && newCount < prevCount * 0.5 && !confirmed) {
      return NextResponse.json({
        success: false,
        error: `Attenzione: il salvataggio ridurrebbe il numero di voci da ${prevCount} a ${newCount}. Riprova con confermaShrink=true se e' voluto.`,
        needsConfirmShrink: true,
        prevCount, newCount,
      }, { status: 400 });
    }

    // Backup dello stato attuale PRIMA di sovrascrivere
    if (prev?.value) {
      await prisma.setting.upsert({
        where: { key: "header.menu.backup" },
        update: { value: prev.value, group: "header" },
        create: { key: "header.menu.backup", value: prev.value, group: "header" },
      });
    }

    await prisma.setting.upsert({
      where: { key: "header.menu" },
      update: { value: JSON.stringify(cleaned), group: "header" },
      create: { key: "header.menu", value: JSON.stringify(cleaned), group: "header" },
    });

    return NextResponse.json({ success: true, count: cleaned.length, backupSaved: !!prev?.value });
  } catch (e) {
    console.error("[admin/header-menu] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

/** POST /restore — reimposta il menu dall'ultimo backup. */
export async function POST() {
  const auth = await requirePermission("settings", "edit");
  if (isErrorResponse(auth)) return auth;

  try {
    const bak = await prisma.setting.findUnique({ where: { key: "header.menu.backup" } });
    if (!bak?.value) {
      return NextResponse.json({ success: false, error: "Nessun backup disponibile" }, { status: 404 });
    }
    await prisma.setting.upsert({
      where: { key: "header.menu" },
      update: { value: bak.value, group: "header" },
      create: { key: "header.menu", value: bak.value, group: "header" },
    });
    return NextResponse.json({ success: true, restored: true });
  } catch (e) {
    console.error("[admin/header-menu restore] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
