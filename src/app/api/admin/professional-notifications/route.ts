import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { translateFields } from "@/lib/ai-translate";

/** Lingue verso cui auto-traduciamo le notifiche bacheca (lingua sorgente: IT). */
const TARGET_LANGS = ["en", "de", "fr", "es"];

/** Lancia in background la traduzione delle notifiche appena create. Errori
 *  silenziati: la response admin torna senza aspettare l'AI. */
function spawnTranslations(notifications: { id: string; title: string; body: string | null }[]) {
  void (async () => {
    for (const n of notifications) {
      for (const target of TARGET_LANGS) {
        try {
          const translated = await translateFields(
            { title: n.title, body: n.body || "" },
            { fromLang: "it", toLang: target }
          );
          if (!translated.title) continue;
          await prisma.professionalNotificationTranslation.upsert({
            where: { notificationId_languageCode: { notificationId: n.id, languageCode: target } },
            update: { title: translated.title, body: translated.body || null },
            create: { notificationId: n.id, languageCode: target, title: translated.title, body: translated.body || null },
          });
        } catch (e) {
          console.error(`[bacheca-translate] notif=${n.id} target=${target}:`, e);
        }
      }
    }
  })();
}

export async function GET() {
  const auth = await requirePermission("newsletter", "view");
  if (isErrorResponse(auth)) return auth;

  const data = await prisma.professionalNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { translations: { select: { languageCode: true } } },
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("newsletter", "create");
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const type = String(body?.type || "info").slice(0, 32);
  const title = String(body?.title || "").trim().slice(0, 255);
  const description = body?.body ? String(body.body).slice(0, 5000) : null;
  const link = body?.link ? String(body.link).slice(0, 500) : null;
  const audiences: string[] | null = Array.isArray(body?.audiences) ? body.audiences : null;

  if (!title) return NextResponse.json({ success: false, error: "Il titolo è obbligatorio" }, { status: 400 });

  const ALLOWED_ROLES = ["RESELLER", "AGENT", "ARCHITECT_DESIGNER", "PRESS"];
  const targets: (string | null)[] = audiences === null
    ? [null]
    : audiences.filter((r) => ALLOWED_ROLES.includes(r));
  if (targets.length === 0) {
    return NextResponse.json({ success: false, error: "Devi selezionare almeno un destinatario o scegliere 'Tutti'." }, { status: 400 });
  }

  const createdAt = new Date();
  const created = await prisma.$transaction(
    targets.map((audience) =>
      prisma.professionalNotification.create({
        data: { type, title, body: description, link, audience, createdAt },
      }),
    ),
  );

  // Fire-and-forget: traduci ogni notifica creata nelle 4 lingue target.
  // L'admin riceve la response subito; le traduzioni arrivano in DB tra
  // pochi secondi (asincrono, non blocca l'utente).
  spawnTranslations(created.map((c) => ({ id: c.id, title: c.title, body: c.body })));

  return NextResponse.json({ success: true, data: created, count: created.length });
}
