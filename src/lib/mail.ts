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
    if (!cfg.smtp_host || !cfg.smtp_user) return false; // SMTP not configured

    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_secure === "true",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    const fromName = options?.fromName || cfg.smtp_from_name || "GTV";
    const fromEmail = cfg.smtp_from_email || cfg.smtp_user;

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
  // Read admin email from DB settings, fallback to env
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
