import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { translateFields } from "@/lib/ai-translate";
import { sendMail } from "@/lib/mail";

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


/** Fire-and-forget: invia email ai professionisti del target audience.
 *  Se audience e' null, invia a tutti i pro attivi (non pending). Usa la
 *  traduzione (ProfessionalNotificationTranslation) per la lingua del pro
 *  se disponibile, altrimenti master IT. */
function spawnEmailsForNotification(notificationId: string, audience: string | null, master: { title: string; body: string | null; link: string | null }) {
  void (async () => {
    try {
      // Aspetta 800ms per dare tempo alle translations di popolarsi (best effort)
      await new Promise((r) => setTimeout(r, 800));
      const pros = await prisma.professional.findMany({
        where: {
          isActive: true,
          pendingApproval: false,
          ...(audience ? { role: audience as "ARCHITECT_DESIGNER" | "PRESS" | "RESELLER" | "AGENT" } : {}),
        },
        select: { email: true, firstName: true, language: true },
      });
      const translations = await prisma.professionalNotificationTranslation.findMany({
        where: { notificationId },
      });
      const byLang = new Map(translations.map((t) => [t.languageCode, t]));

      for (const pro of pros) {
        const lang = (pro.language || "it").toLowerCase();
        const tr = byLang.get(lang);
        const title = tr?.title || master.title;
        const bodyTxt = tr?.body || master.body || "";
        const link = tr?.link || master.link || "";
        const openHref = link || (process.env.NEXT_PUBLIC_SITE_URL || "https://gebruederthonetvienna.com") + "/area-professionisti/bacheca";
        const cta = lang === "en" ? "Open on bulletin board"
                  : lang === "fr" ? "Ouvrir sur le tableau"
                  : lang === "de" ? "Auf der Pinnwand offnen"
                  : lang === "es" ? "Abrir en el tablon"
                  : "Apri sulla bacheca";
        const greeting = lang === "en" ? "Hi" : lang === "fr" ? "Bonjour" : lang === "de" ? "Hallo" : lang === "es" ? "Hola" : "Ciao";
        const bodyHtml = bodyTxt.split("\n").map((l) => l).join("<br/>");
        const html = `<div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
  <p style="font-size: 15px; margin: 0 0 16px;">${greeting} ${pro.firstName || ""},</p>
  <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 0.02em; margin: 0 0 18px;">${title}</h1>
  ${bodyTxt ? `<div style="font-size: 15px; line-height: 1.55; margin: 0 0 24px;">${bodyHtml}</div>` : ""}
  <p style="margin: 0 0 24px;">
    <a href="${openHref}" style="display: inline-block; padding: 12px 22px; background: #111; color: #fff; text-decoration: none; text-transform: uppercase; font-size: 12px; letter-spacing: 0.18em;">${cta}</a>
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 32px;">Gebrueder Thonet Vienna</p>
</div>`;
        void sendMail(pro.email, title, html).catch((e) => {
          console.error(`[bacheca-email] to=${pro.email} lang=${lang}:`, e);
        });
      }
      console.log(`[bacheca-email] notif=${notificationId} audience=${audience || "ALL"} enqueued=${pros.length}`);
    } catch (e) {
      console.error(`[bacheca-email] notif=${notificationId} error:`, e);
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

  // Invio email fire-and-forget ai professionisti del target audience
  for (const c of created) {
    spawnEmailsForNotification(c.id, c.audience, { title: c.title, body: c.body, link: c.link });
  }

  return NextResponse.json({ success: true, data: created, count: created.length });
}
