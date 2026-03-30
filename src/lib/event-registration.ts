import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { mkdir } from "fs/promises";
import path from "path";

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

export async function generateQRCodeFile(text: string, filename: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "qrcodes");
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  await QRCode.toFile(filePath, text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  return `/uploads/qrcodes/${filename}`;
}

export function buildRegistrationEmailHtml(
  firstName: string,
  lastName: string,
  qrCode: string,
  emailTitle: string,
  emailBody: string,
  emailFooter: string,
  qrImageUrl?: string
): string {
  const bodyLines = emailBody
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .split("\n")
    .map((line) => `<p style="font-size: 15px; color: #333; margin: 0 0 8px 0;">${line}</p>`)
    .join("");

  const footerLines = emailFooter.split("\n").join("<br/>");

  const qrSrc = qrImageUrl || "cid:qrcode";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center;">
      <h1 style="font-size: 22px; font-weight: bold; color: #000; margin-bottom: 20px;">
        ${emailTitle}
      </h1>
      <div style="margin-bottom: 30px;">
        ${bodyLines}
      </div>
      <div style="display: inline-block; border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <img src="${qrSrc}" alt="QR Code" width="250" height="250" style="display: block;" />
      </div>
      <p style="font-size: 11px; color: #999; margin-top: 16px;">
        QR Code ID: ${qrCode}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
      <p style="font-size: 12px; color: #999;">
        ${footerLines}
      </p>
    </div>
  `;
}

async function getMailConfig() {
  const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;
  return config;
}

function getSiteUrl() {
  return process.env.NEXTAUTH_URL || "http://192.168.150.52:3002";
}

async function sendViaBrevoApi(
  apiKey: string,
  fromName: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string
) {
  const body = JSON.stringify({
    sender: { name: fromName, email: fromEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
  });

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function sendRegistrationEmailWithConfig(
  toEmail: string,
  firstName: string,
  lastName: string,
  qrCode: string,
  qrDataUrl: string,
  emailConfig: { emailSubject: string; emailTitle: string; emailBody: string; emailFooter: string }
) {
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const cfg = await getMailConfig();

  const fromName = cfg.smtp_from_name || "GTV";
  const fromEmail = cfg.smtp_from_email || "noreply@localhost";

  // Save QR code as file on server for email usage
  const qrFilename = `qr-${qrCode}.png`;
  const qrPath = await generateQRCodeFile(qrCode, qrFilename);
  const qrFullUrl = `${getSiteUrl()}${qrPath}`;

  // Prefer Brevo HTTP API
  if (cfg.brevo_api_key) {
    const html = buildRegistrationEmailHtml(
      firstName, lastName, qrCode,
      emailConfig.emailTitle, emailConfig.emailBody, emailConfig.emailFooter,
      qrFullUrl
    );

    await sendViaBrevoApi(
      cfg.brevo_api_key, fromName, fromEmail, toEmail,
      emailConfig.emailSubject, html
    );
    return;
  }

  // Fallback: SMTP via nodemailer with CID
  if (!cfg.smtp_host) throw new Error("Email not configured (no Brevo API key or SMTP host)");

  const html = buildRegistrationEmailHtml(
    firstName, lastName, qrCode,
    emailConfig.emailTitle, emailConfig.emailBody, emailConfig.emailFooter
  );

  const nodemailer = (await import("nodemailer")).default;
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
    to: toEmail,
    subject: emailConfig.emailSubject,
    html,
    attachments: [
      { filename: "qrcode.png", content: Buffer.from(base64Data, "base64"), cid: "qrcode" },
    ],
  });
}

export async function getEmailConfig() {
  const config = await prisma.landingPageConfig.findFirst({ where: { slug: "default" } });
  return {
    emailSubject: config?.emailSubject || "Your Event Registration - QR Code",
    emailTitle: config?.emailTitle || "Registration Confirmed",
    emailBody: config?.emailBody || "Thank you for registering. Please find below your personal QR code to show at the entrance.\nThe QR code is personal and can't be shared.",
    emailFooter: config?.emailFooter || "Gebrüder Thonet Vienna GmbH\nVia Foggia 23/H – 10152 Torino (Italy)",
  };
}
