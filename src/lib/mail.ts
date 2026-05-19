import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;
  return config;
}

export interface MailAttachment {
  /** Nome file mostrato all'utente (es. "ordine-GTV-123.pdf"). */
  filename: string;
  /** Contenuto del file. */
  content: Buffer;
  /** MIME type. Default "application/octet-stream". */
  contentType?: string;
}

interface SendMailOptions {
  fromName?: string;
  fromEmail?: string;
  /** BCC (per copia interna). */
  bcc?: string;
  /** Reply-to esplicito. Se non passato deduce da fromEmail. */
  replyTo?: string;
  /** Allegati. Supportato sia da Brevo HTTP che da nodemailer. */
  attachments?: MailAttachment[];
}

export interface SendMailResult { ok: boolean; error?: string }

/** Come sendMail ma ritorna l'esito dettagliato (con messaggio d'errore). */
export async function sendMailResult(to: string, subject: string, html: string, options?: SendMailOptions): Promise<SendMailResult> {
  try {
    const cfg = await getSmtpConfig();

    const fromName = options?.fromName || cfg.smtp_from_name || "GTV";
    const fromEmail = options?.fromEmail || cfg.smtp_from_email || cfg.smtp_user || "noreply@localhost";

    // Prefer Brevo HTTP API
    if (cfg.brevo_api_key) {
      const payload: Record<string, unknown> = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };
      if (options?.bcc) payload.bcc = [{ email: options.bcc }];
      if (options?.replyTo) payload.replyTo = { email: options.replyTo };
      if (options?.attachments?.length) {
        payload.attachment = options.attachments.map((a) => ({
          name: a.filename,
          content: a.content.toString("base64"),
        }));
      }

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": cfg.brevo_api_key, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Brevo API error:", err);
        return { ok: false, error: `Brevo: ${String(err).slice(0, 400)}` };
      }
      return { ok: true };
    }

    // Fallback: SMTP via nodemailer
    if (!cfg.smtp_host) return { ok: false, error: "SMTP non configurato" };

    const transportConfig: Record<string, unknown> = {
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "25"),
      secure: cfg.smtp_secure === "true",
    };
    if (cfg.smtp_user) {
      transportConfig.auth = { user: cfg.smtp_user, pass: cfg.smtp_pass };
    } else {
      transportConfig.tls = { rejectUnauthorized: false };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: options?.replyTo
        || (options?.fromEmail ? `"${options.fromName || fromName}" <${options.fromEmail}>` : undefined),
      to,
      bcc: options?.bcc,
      subject,
      html,
      attachments: options?.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || "application/octet-stream",
      })),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Email send error:", e);
    return { ok: false, error: msg.slice(0, 400) };
  }
}

/** Wrapper retro-compatibile: ritorna solo true/false. */
export async function sendMail(to: string, subject: string, html: string, options?: SendMailOptions): Promise<boolean> {
  const r = await sendMailResult(to, subject, html, options);
  return r.ok;
}

export async function sendContactNotification(
  name: string,
  email: string,
  subject: string | null,
  message: string,
  type: string
): Promise<void> {
  const adminSetting = await prisma.setting.findUnique({ where: { key: "admin_email" } });
  const adminEmail = adminSetting?.value || process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const html = `
    <h2>Nuovo messaggio dal sito GTV</h2>
    <p><strong>Tipo:</strong> ${type}</p>
    <p><strong>Nome:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${subject ? `<p><strong>Oggetto:</strong> ${subject}</p>` : ""}
    <p><strong>Messaggio:</strong></p>
    <p>${message.replace(/\n/g, "<br>")}</p>
  `;

  await sendMail(adminEmail, `[GTV] Nuovo messaggio da ${name}`, html);
}
