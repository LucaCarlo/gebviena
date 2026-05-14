/**
 * Token-based passwordless login per i clienti dello store.
 *
 * - `magic_link`   : 3 utilizzi, valido 7 giorni. Permette al cliente di
 *                    entrare nell'area riservata senza password. Al primo
 *                    accesso DEVE settare una password.
 * - `password_reset`: 1 utilizzo, valido 1 ora. Reset password classico.
 *
 * Il token è 32 byte random hex (64 char). Nessun hashing in DB perché è
 * single-purpose, short-lived e ha contatore usi: il rischio è basso e il
 * trade-off su UX (link cliccabile dall'email) ne vale.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

export const MAGIC_LINK_MAX_USES = 3;
export const MAGIC_LINK_TTL_DAYS = 7;
export const PASSWORD_RESET_MAX_USES = 1;
export const PASSWORD_RESET_TTL_HOURS = 1;

const COMPANY_NAME = "Gebrüder Thonet Vienna";
const COMPANY_EMAIL = "info@gebruederthonetvienna.com";

export type TokenPurpose = "magic_link" | "password_reset";

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

interface CreateTokenInput {
  customerId: string;
  purpose: TokenPurpose;
}

export async function createLoginToken({ customerId, purpose }: CreateTokenInput) {
  const token = newToken();
  const now = Date.now();
  const ttlMs = purpose === "password_reset"
    ? PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000
    : MAGIC_LINK_TTL_DAYS * 24 * 60 * 60 * 1000;
  const usesRemaining = purpose === "password_reset" ? PASSWORD_RESET_MAX_USES : MAGIC_LINK_MAX_USES;

  await prisma.customerLoginToken.create({
    data: {
      token,
      customerId,
      purpose,
      usesRemaining,
      expiresAt: new Date(now + ttlMs),
    },
  });
  return token;
}

/**
 * Verifica e consuma 1 utilizzo del token.
 * Ritorna `{ customerId, purpose }` se valido, `null` altrimenti.
 * Non rivela perché il token è invalido (security best practice).
 */
export async function consumeLoginToken(token: string): Promise<{ customerId: string; purpose: TokenPurpose } | null> {
  if (!token || token.length < 16) return null;

  return prisma.$transaction(async (tx) => {
    const row = await tx.customerLoginToken.findUnique({ where: { token } });
    if (!row) return null;
    if (row.usesRemaining <= 0) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;

    await tx.customerLoginToken.update({
      where: { id: row.id },
      data: {
        usesRemaining: row.usesRemaining - 1,
        lastUsedAt: new Date(),
      },
    });
    return { customerId: row.customerId, purpose: row.purpose as TokenPurpose };
  });
}

function emailBody(opts: {
  firstName: string | null;
  url: string;
  purpose: TokenPurpose;
  language: string;
  maxUses: number;
  ttlLabel: string;
}): { subject: string; html: string } {
  const isFr = opts.language === "fr";
  const greeting = isFr ? `Bonjour ${opts.firstName || ""},` : `Ciao ${opts.firstName || ""},`;

  if (opts.purpose === "password_reset") {
    const subject = isFr
      ? `Réinitialiser votre mot de passe — ${COMPANY_NAME}`
      : `Reimposta la tua password — ${COMPANY_NAME}`;
    const intro = isFr
      ? "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous (valable 1 heure)."
      : "Hai chiesto di reimpostare la tua password. Clicca sul pulsante qui sotto (valido 1 ora).";
    const cta = isFr ? "Choisir un nouveau mot de passe" : "Scegli una nuova password";
    const ignore = isFr
      ? "Si vous n'avez pas demandé cette opération, ignorez simplement cet email."
      : "Se non hai richiesto tu questa operazione, ignora pure questa email.";
    return { subject, html: htmlWrap({ greeting, intro, cta, url: opts.url, ignore }) };
  }

  // magic_link
  const subject = isFr
    ? `Votre lien de connexion — ${COMPANY_NAME}`
    : `Il tuo link di accesso — ${COMPANY_NAME}`;
  const intro = isFr
    ? `Voici votre lien de connexion à votre espace privé. Il est valable ${opts.ttlLabel} et utilisable jusqu'à ${opts.maxUses} fois.`
    : `Ecco il tuo link di accesso all'area riservata. È valido ${opts.ttlLabel} e usabile fino a ${opts.maxUses} volte.`;
  const cta = isFr ? "Accéder à mon espace" : "Accedi all'area riservata";
  const ignore = isFr
    ? "Lors de votre première connexion, il vous sera demandé de choisir un mot de passe pour les accès suivants."
    : "Al primo accesso ti chiederemo di scegliere una password per i login successivi.";
  return { subject, html: htmlWrap({ greeting, intro, cta, url: opts.url, ignore }) };
}

function htmlWrap(opts: { greeting: string; intro: string; cta: string; url: string; ignore: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e2db;">
        <tr><td style="padding:32px 32px 16px;border-bottom:1px solid #e5e2db;">
          <div style="font-size:11px;color:#888;letter-spacing:0.2em;text-transform:uppercase;">${escape(COMPANY_NAME)}</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 12px;color:#333;font-size:15px;">${escape(opts.greeting)}</p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">${escape(opts.intro)}</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="padding:0;">
            <a href="${opts.url}" style="display:inline-block;background:#222;color:#fff;padding:14px 28px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">${escape(opts.cta)}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.6;">${escape(opts.ignore)}</p>
          <p style="margin:12px 0 0;color:#bbb;font-size:11px;word-break:break-all;">${escape(opts.url)}</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#faf8f3;border-top:1px solid #e5e2db;font-size:11px;color:#888;">${escape(COMPANY_NAME)} · <a href="mailto:${escape(COMPANY_EMAIL)}" style="color:#888;">${escape(COMPANY_EMAIL)}</a></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

/** Costruisce l'URL assoluto da inviare nell'email. */
export function buildMagicUrl(origin: string, token: string, purpose: TokenPurpose): string {
  const path = purpose === "password_reset" ? "/account/reset-password" : "/account/login-token";
  return `${origin}${path}?t=${encodeURIComponent(token)}`;
}

/**
 * Genera token + email per accesso magic-link.
 * NOTA: per evitare email-enumeration, il caller dovrebbe rispondere 200
 * sempre — anche quando il customer non esiste. Questo helper crea il
 * token solo se il customer esiste; lascia al caller la risposta neutra.
 */
export async function requestMagicLink(opts: {
  email: string;
  origin: string;
  purpose?: TokenPurpose; // default magic_link
}): Promise<{ sent: boolean }> {
  const email = opts.email.trim().toLowerCase();
  if (!email) return { sent: false };

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !customer.isActive) return { sent: false };

  const purpose: TokenPurpose = opts.purpose === "password_reset" ? "password_reset" : "magic_link";
  const token = await createLoginToken({ customerId: customer.id, purpose });
  const url = buildMagicUrl(opts.origin, token, purpose);

  const ttlLabel = purpose === "password_reset"
    ? (customer.language === "fr" ? "1 heure" : "1 ora")
    : (customer.language === "fr" ? "7 jours" : "7 giorni");

  const maxUses = purpose === "password_reset" ? PASSWORD_RESET_MAX_USES : MAGIC_LINK_MAX_USES;

  const { subject, html } = emailBody({
    firstName: customer.firstName,
    url,
    purpose,
    language: customer.language || "it",
    maxUses,
    ttlLabel,
  });

  const ok = await sendMail(email, subject, html, {
    fromName: COMPANY_NAME,
    replyTo: COMPANY_EMAIL,
  });
  return { sent: ok };
}
