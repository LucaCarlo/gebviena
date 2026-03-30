import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;
  return config;
}

interface SendMailOptions {
  fromName?: string;
  fromEmail?: string;
}

export async function sendMail(to: string, subject: string, html: string, options?: SendMailOptions): Promise<boolean> {
  try {
    const cfg = await getSmtpConfig();

    const fromName = options?.fromName || cfg.smtp_from_name || "GTV";
    const fromEmail = options?.fromEmail || cfg.smtp_from_email || cfg.smtp_user || "noreply@localhost";

    // Prefer Brevo HTTP API
    if (cfg.brevo_api_key) {
      const body = JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      });

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": cfg.brevo_api_key, "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Brevo API error:", err);
        return false;
      }
      return true;
    }

    // Fallback: SMTP via nodemailer
    if (!cfg.smtp_host) return false;

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
      replyTo: options?.fromEmail ? `"${options.fromName || fromName}" <${options.fromEmail}>` : undefined,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
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
