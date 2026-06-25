import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const TARGET_LANGS = ["en", "de", "fr", "es"];

/** GET — singola notifica con le sue traduzioni (per popolare l'editor). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("newsletter", "view");
  if (isErrorResponse(auth)) return auth;
  const { id } = await params;
  const data = await prisma.professionalNotification.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!data) return NextResponse.json({ success: false, error: "Non trovata" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

/** PATCH — modifica title/body/link/type + sovrascrive le traduzioni passate. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("newsletter", "edit");
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: { type?: string; title?: string; body?: string | null; link?: string | null } = {};
  if (typeof body.type === "string") update.type = body.type.slice(0, 32);
  if (typeof body.title === "string") update.title = body.title.trim().slice(0, 255);
  if ("body" in body) update.body = body.body ? String(body.body).slice(0, 5000) : null;
  if ("link" in body) update.link = body.link ? String(body.link).slice(0, 500) : null;

  if (Object.keys(update).length === 0 && !body.translations) {
    return NextResponse.json({ success: false, error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    await prisma.professionalNotification.update({ where: { id }, data: update });
  }

  // Traduzioni esplicite: { en: {title, body, link?}, de: {...}, ... }
  if (body.translations && typeof body.translations === "object") {
    for (const lang of TARGET_LANGS) {
      const tr = body.translations[lang];
      if (!tr || typeof tr !== "object") continue;
      const t = typeof tr.title === "string" ? tr.title.trim().slice(0, 255) : "";
      const b = tr.body ? String(tr.body).slice(0, 5000) : null;
      const l = tr.link ? String(tr.link).slice(0, 500) : null;
      if (!t) continue;
      await prisma.professionalNotificationTranslation.upsert({
        where: { notificationId_languageCode: { notificationId: id, languageCode: lang } },
        update: { title: t, body: b, link: l },
        create: { notificationId: id, languageCode: lang, title: t, body: b, link: l },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("newsletter", "delete");
  if (isErrorResponse(auth)) return auth;
  const { id } = await params;
  await prisma.professionalNotification.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
