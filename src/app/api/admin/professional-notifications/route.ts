import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { translateFields } from "@/lib/ai-translate";

/** Lingue verso cui auto-traduciamo le notifiche bacheca (lingua sorgente: IT). */
const TARGET_LANGS = ["en", "de", "fr", "es"];

/** Lancia in background la traduzione delle notifiche appena create. Errori
 *  silenziati: la response admin torna senza aspettare l'AI. */
function spawnTranslations(notifications: { id: string; title: string; body: string | null; link: string | null }[]) {
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
            update: { title: translated.title, body: translated.body || null, link: n.link },
            create: { notificationId: n.id, languageCode: target, title: translated.title, body: translated.body || null, link: n.link },
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

  // Se l'admin ha gia fornito le traduzioni (4 lingue) nel body, le salviamo
  // direttamente e saltiamo l'auto-translate AI. Formato: translations: { en: {title, body, link?}, ... }
  const explicit = body?.translations && typeof body.translations === "object" ? body.translations as Record<string, { title?: string; body?: string; link?: string }> : null;
  if (explicit) {
    for (const lang of TARGET_LANGS) {
      const tr = explicit[lang];
      if (!tr || typeof tr.title !== "string" || !tr.title.trim()) continue;
      const tTitle = tr.title.trim().slice(0, 255);
      const tBody = tr.body ? String(tr.body).slice(0, 5000) : null;
      const tLink = tr.link ? String(tr.link).slice(0, 500) : (link || null);
      for (const c of created) {
        await prisma.professionalNotificationTranslation.upsert({
          where: { notificationId_languageCode: { notificationId: c.id, languageCode: lang } },
          update: { title: tTitle, body: tBody, link: tLink },
          create: { notificationId: c.id, languageCode: lang, title: tTitle, body: tBody, link: tLink },
        });
      }
    }
  } else {
    // Fire-and-forget: traduzione AI in background. Il link del master viene
    // copiato in tutte le traduzioni — l'admin puo poi modificarlo per lingua.
    spawnTranslations(created.map((c) => ({ id: c.id, title: c.title, body: c.body, link: c.link })));
  }

  return NextResponse.json({ success: true, data: created, count: created.length });
}
