import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { loadTemplateForLang } from "@/lib/email-template-i18n";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import crypto from "node:crypto";

// ─── Multilingua testi email (compatti, ridondanza accettabile per leggibilità) ─

interface ProEmailTexts {
  // Admin notification
  adminSubject: string;
  adminTitle: string;
  adminIntro: string;
  adminCta: string;
  // User approval mail
  userSubject: string;
  userGreeting: string; // "Ciao {name},"
  userTitle: string;    // "La tua richiesta è stata approvata"
  userBody: string;     // testo descrittivo con [link]
  userCredsTitle: string;
  userEmailLabel: string;
  userPasswordLabel: string;
  userCta: string;      // "ACCEDI"
  userSecurity: string; // "ti consigliamo di cambiare la password dopo il primo accesso..."
  userSignature: string;
  // Role labels (per email admin)
  role: Record<string, string>;
}

const TEXTS: Record<string, ProEmailTexts> = {
  it: {
    adminSubject: "Nuova richiesta accesso Area Professionisti — {company}",
    adminTitle: "Nuova richiesta accesso",
    adminIntro: "Hai ricevuto una nuova richiesta di accesso all'Area Professionisti dal sito.",
    adminCta: "Vai al pannello professionisti",
    userSubject: "Il tuo accesso all'Area Professionisti GTV è stato approvato",
    userGreeting: "Ciao {name},",
    userTitle: "La tua richiesta è stata approvata",
    userBody: "Grazie per aver richiesto l'accesso all'Area Professionisti di Gebrüder Thonet Vienna. Il tuo account è ora attivo. Qui sotto trovi le credenziali per accedere.",
    userCredsTitle: "Le tue credenziali",
    userEmailLabel: "Email",
    userPasswordLabel: "Password temporanea",
    userCta: "ACCEDI ALL'AREA PROFESSIONISTI",
    userSecurity: "Per sicurezza, ti consigliamo di cambiare la password al primo accesso dall'area riservata.",
    userSignature: "Il team Gebrüder Thonet Vienna",
    role: { ARCHITECT_DESIGNER: "Architetto & Designer", PRESS: "Stampa", RESELLER: "Rivenditore", AGENT: "Agente" },
  },
  fr: {
    adminSubject: "Nouvelle demande Espace Professionnels — {company}",
    adminTitle: "Nouvelle demande d'accès",
    adminIntro: "Vous avez reçu une nouvelle demande d'accès à l'Espace Professionnels depuis le site.",
    adminCta: "Aller au panneau professionnels",
    userSubject: "Votre accès à l'Espace Professionnels GTV a été approuvé",
    userGreeting: "Bonjour {name},",
    userTitle: "Votre demande a été approuvée",
    userBody: "Merci d'avoir demandé l'accès à l'Espace Professionnels Gebrüder Thonet Vienna. Votre compte est désormais actif. Vous trouverez ci-dessous vos identifiants.",
    userCredsTitle: "Vos identifiants",
    userEmailLabel: "Email",
    userPasswordLabel: "Mot de passe temporaire",
    userCta: "ACCÉDER À L'ESPACE PROFESSIONNELS",
    userSecurity: "Pour des raisons de sécurité, nous vous conseillons de modifier votre mot de passe lors de votre première connexion.",
    userSignature: "L'équipe Gebrüder Thonet Vienna",
    role: { ARCHITECT_DESIGNER: "Architecte & Designer", PRESS: "Presse", RESELLER: "Revendeur", AGENT: "Agent" },
  },
  en: {
    adminSubject: "New Professionals Area request — {company}",
    adminTitle: "New access request",
    adminIntro: "You received a new request to access the Professionals Area from the website.",
    adminCta: "Go to professionals panel",
    userSubject: "Your access to the GTV Professionals Area has been approved",
    userGreeting: "Hi {name},",
    userTitle: "Your request has been approved",
    userBody: "Thank you for requesting access to Gebrüder Thonet Vienna's Professionals Area. Your account is now active. Below you'll find your credentials.",
    userCredsTitle: "Your credentials",
    userEmailLabel: "Email",
    userPasswordLabel: "Temporary password",
    userCta: "ACCESS THE PROFESSIONALS AREA",
    userSecurity: "For security, we recommend changing your password on first login.",
    userSignature: "The Gebrüder Thonet Vienna team",
    role: { ARCHITECT_DESIGNER: "Architect & Designer", PRESS: "Press", RESELLER: "Reseller", AGENT: "Agent" },
  },
  de: {
    adminSubject: "Neue Anfrage Professionals Bereich — {company}",
    adminTitle: "Neue Zugangsanfrage",
    adminIntro: "Sie haben eine neue Anfrage für den Zugang zum Professionals Bereich erhalten.",
    adminCta: "Zum Professionals-Panel",
    userSubject: "Ihr Zugang zum GTV Professionals Bereich wurde genehmigt",
    userGreeting: "Hallo {name},",
    userTitle: "Ihre Anfrage wurde genehmigt",
    userBody: "Danke für Ihre Anfrage zum Zugang zum Professionals Bereich von Gebrüder Thonet Vienna. Ihr Konto ist jetzt aktiv. Unten finden Sie Ihre Zugangsdaten.",
    userCredsTitle: "Ihre Zugangsdaten",
    userEmailLabel: "E-Mail",
    userPasswordLabel: "Temporäres Passwort",
    userCta: "ZUM PROFESSIONALS BEREICH",
    userSecurity: "Aus Sicherheitsgründen empfehlen wir, Ihr Passwort bei der ersten Anmeldung zu ändern.",
    userSignature: "Ihr Gebrüder Thonet Vienna Team",
    role: { ARCHITECT_DESIGNER: "Architekt & Designer", PRESS: "Presse", RESELLER: "Wiederverkäufer", AGENT: "Vertreter" },
  },
  es: {
    adminSubject: "Nueva solicitud Área Profesionales — {company}",
    adminTitle: "Nueva solicitud de acceso",
    adminIntro: "Has recibido una nueva solicitud de acceso al Área Profesionales desde el sitio.",
    adminCta: "Ir al panel profesionales",
    userSubject: "Tu acceso al Área Profesionales GTV ha sido aprobado",
    userGreeting: "Hola {name},",
    userTitle: "Tu solicitud ha sido aprobada",
    userBody: "Gracias por solicitar el acceso al Área Profesionales de Gebrüder Thonet Vienna. Tu cuenta está activa. A continuación encontrarás tus credenciales.",
    userCredsTitle: "Tus credenciales",
    userEmailLabel: "Correo",
    userPasswordLabel: "Contraseña temporal",
    userCta: "ACCEDER AL ÁREA PROFESIONALES",
    userSecurity: "Por seguridad, te recomendamos cambiar la contraseña en el primer acceso.",
    userSignature: "El equipo Gebrüder Thonet Vienna",
    role: { ARCHITECT_DESIGNER: "Arquitecto & Diseñador", PRESS: "Prensa", RESELLER: "Revendedor", AGENT: "Agente" },
  },
};

function pickLang(lang: string | null | undefined): string {
  const l = (lang || "it").toLowerCase();
  return TEXTS[l] ? l : "it";
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Genera password "leggibile" abbastanza forte: 14 caratteri alfanumerici
 *  con almeno 1 maiuscola, 1 minuscola, 1 cifra. Evitiamo caratteri ambigui
 *  (0/O, l/I/1) per ridurre errori di trascrizione da email. */
export function generateRandomPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];
  // Garantiamo 3 caratteri di ciascuna classe + 5 random per arrivare a 14
  const pool: string[] = [
    pick(upper), pick(upper),
    pick(lower), pick(lower), pick(lower), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(digits),
    pick(all), pick(all), pick(all), pick(all),
  ];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.join("");
}

/** Risolve la email admin a cui mandare le notifiche. Riusa lo stesso setting
 *  usato dal form contatti (smtp.admin_email) con fallback hardcoded. */
async function getAdminEmail(): Promise<string> {
  const row = await prisma.setting.findUnique({
    where: { key: "smtp.admin_email" },
    select: { value: true },
  }).catch(() => null);
  const v = (row?.value || "").trim();
  if (v) return v;
  return "info@gebruederthonetvienna.com";
}

function getSiteBase(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL || "https://gebruederthonetvienna.com";
  return v.replace(/\/+$/, "");
}

/** Notifica all'admin che è arrivata una richiesta di accesso da rivenditore/agente. */
export async function notifyAdminNewRequest(pro: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string;
  role: string;
  language: string;
}): Promise<void> {
  const t = TEXTS.it; // admin email sempre in italiano (è il gestore)
  const roleLabel = t.role[pro.role] || pro.role;
  const base = getSiteBase();
  const adminPanelUrl = `${base}/admin/persone/professionisti`;
  const subject = t.adminSubject.replace("{company}", pro.company);
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f4f2;font-family:Arial,Helvetica,sans-serif;color:#2d2b27;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f2;padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:560px;width:100%;border:1px solid #e8e6e3;">
  <tr><td style="padding:32px 32px 16px 32px;">
    <div style="text-transform:uppercase;letter-spacing:0.2em;font-size:11px;color:#7c766e;">${t.adminTitle}</div>
    <div style="font-size:22px;font-weight:600;color:#1c1b18;margin-top:8px;">${escape(pro.firstName)} ${escape(pro.lastName)}</div>
    <div style="font-size:14px;color:#5c5650;margin-top:4px;">${escape(pro.company)} — ${escape(roleLabel)}</div>
  </td></tr>
  <tr><td style="padding:0 32px 24px 32px;font-size:14px;line-height:1.6;color:#434039;">
    ${escape(t.adminIntro)}
  </td></tr>
  <tr><td style="padding:0 32px 24px 32px;">
    <table cellpadding="6" cellspacing="0" border="0" style="font-size:13px;color:#434039;border-collapse:collapse;width:100%;">
      <tr><td style="color:#7c766e;width:120px;">Email</td><td><a href="mailto:${pro.email}" style="color:#2d2b27;">${escape(pro.email)}</a></td></tr>
      ${pro.phone ? `<tr><td style="color:#7c766e;">Telefono</td><td>${escape(pro.phone)}</td></tr>` : ""}
      <tr><td style="color:#7c766e;">Azienda</td><td>${escape(pro.company)}</td></tr>
      <tr><td style="color:#7c766e;">Ruolo</td><td>${escape(roleLabel)}</td></tr>
      <tr><td style="color:#7c766e;">Lingua</td><td>${pro.language.toUpperCase()}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">
    <a href="${adminPanelUrl}" style="display:inline-block;background:#1c1b18;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">${t.adminCta}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  const to = await getAdminEmail();
  await sendMail(to, subject, html);
}

/** Email all'utente appena approvato: contiene email + password generata + link login.
 *
 *  STRATEGIA:
 *  1. Cerca un EmailTemplate via setting `professional.approval_template_id`
 *     (fallback per nome "Approvazione Area Professionisti") e ne carica la
 *     traduzione nella lingua del professionista via `loadTemplateForLang`.
 *  2. Renderizza i blocchi sostituendo le variabili {{firstName}}, {{lastName}},
 *     {{email}}, {{password}}, {{loginUrl}}.
 *  3. Se per qualsiasi motivo il template non è disponibile, **fallback** al
 *     vecchio HTML hardcoded (sotto). Così non si rompe nulla.
 */
export async function sendApprovalCredentials(pro: {
  firstName: string;
  lastName: string;
  email: string;
  language: string;
}, plaintextPassword: string): Promise<void> {
  const base = getSiteBase();
  const langPrefix = pro.language === "it" ? "" : `/${pro.language}`;
  const loginUrl = `${base}${langPrefix}/area-professionisti/accesso`;

  // Variabili disponibili nei blocchi del template
  const variables = {
    firstName: pro.firstName,
    lastName: pro.lastName,
    email: pro.email,
    password: plaintextPassword,
    loginUrl,
  };

  // 1. Risolvi l'id del template dal Setting (o fallback per nome)
  let templateId: string | null = null;
  try {
    const idSetting = await prisma.setting.findUnique({
      where: { key: "professional.approval_template_id" },
      select: { value: true },
    });
    templateId = (idSetting?.value || "").trim() || null;
    if (!templateId) {
      const byName = await prisma.emailTemplate.findFirst({
        where: { name: "Approvazione Area Professionisti" },
        select: { id: true },
      });
      templateId = byName?.id || null;
    }
  } catch { /* fall through to fallback */ }

  // 2. Carica template tradotto e renderizza
  if (templateId) {
    try {
      const tpl = await loadTemplateForLang(templateId, pro.language);
      if (tpl) {
        const blocks = parseBlocks(tpl.blocks);
        if (blocks.length > 0) {
          const html = renderEmailTemplate(blocks, variables);
          // Sostituisci variabili anche nel subject
          let subject = tpl.subject;
          for (const [k, v] of Object.entries(variables)) {
            subject = subject.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
          }
          await sendMail(pro.email, subject, html);
          return;
        }
      }
    } catch (e) {
      console.error("[sendApprovalCredentials] template render failed, fallback hardcoded:", e);
    }
  }

  // 3. FALLBACK: HTML hardcoded multilingua (era l'implementazione precedente)
  const t = TEXTS[pickLang(pro.language)];
  const greeting = t.userGreeting.replace("{name}", escape(pro.firstName));
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f4f2;font-family:Arial,Helvetica,sans-serif;color:#2d2b27;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f2;padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:560px;width:100%;border:1px solid #e8e6e3;">
  <tr><td style="padding:32px 32px 8px 32px;">
    <div style="font-size:15px;color:#434039;">${greeting}</div>
    <div style="font-size:24px;font-weight:600;color:#1c1b18;margin-top:12px;line-height:1.2;">${escape(t.userTitle)}</div>
  </td></tr>
  <tr><td style="padding:16px 32px 24px 32px;font-size:14px;line-height:1.7;color:#434039;">
    ${escape(t.userBody)}
  </td></tr>
  <tr><td style="padding:0 32px 8px 32px;">
    <div style="background:#fafaf9;border:1px solid #e8e6e3;padding:20px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7c766e;margin-bottom:12px;">${escape(t.userCredsTitle)}</div>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#2d2b27;width:100%;">
        <tr><td style="color:#7c766e;padding:4px 8px 4px 0;width:140px;">${escape(t.userEmailLabel)}</td><td style="font-family:Menlo,Consolas,monospace;font-weight:600;">${escape(pro.email)}</td></tr>
        <tr><td style="color:#7c766e;padding:4px 8px 4px 0;">${escape(t.userPasswordLabel)}</td><td style="font-family:Menlo,Consolas,monospace;font-weight:600;letter-spacing:0.05em;">${escape(plaintextPassword)}</td></tr>
      </table>
    </div>
  </td></tr>
  <tr><td style="padding:24px 32px 0 32px;">
    <a href="${loginUrl}" style="display:inline-block;background:#1c1b18;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">${escape(t.userCta)}</a>
  </td></tr>
  <tr><td style="padding:20px 32px 32px 32px;font-size:12px;line-height:1.6;color:#7c766e;">
    ${escape(t.userSecurity)}
    <br/><br/>
    ${escape(t.userSignature)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  await sendMail(pro.email, t.userSubject, html);
}
