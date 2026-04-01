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
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  return `/uploads/qrcodes/${filename}`;
}

function getSiteUrl() {
  return process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";
}

export function buildRegistrationEmailHtml(opts: {
  firstName: string;
  lastName: string;
  qrCode: string;
  emailTitle: string;
  emailBody: string;
  signatureHtml?: string;
  qrImageUrl?: string;
  bannerImageUrl?: string;
}): string {
  const { firstName, lastName, qrCode, emailTitle, emailBody, signatureHtml, qrImageUrl, bannerImageUrl } = opts;

  const bodyLines = emailBody
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .split("\n")
    .map((line) => `<p style="font-size: 15px; color: #ffffff; margin: 0 0 10px 0; font-style: italic;">${line}</p>`)
    .join("");

  const qrSrc = qrImageUrl || "cid:qrcode";

  const bannerSection = bannerImageUrl
    ? `<img src="${bannerImageUrl}" alt="Event Banner" width="600" style="display: block; width: 100%; max-width: 600px; height: auto;" />`
    : "";

  const signatureSection = signatureHtml
    ? `<div style="padding: 20px 40px;">${signatureHtml}</div>`
    : "";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Banner -->
      ${bannerSection}

      <!-- Header section -->
      <div style="background-color: #3a5a6a; padding: 35px 40px 25px 40px; text-align: center;">
        <h1 style="font-size: 22px; font-weight: normal; color: #ffffff; margin: 0 0 8px 0; letter-spacing: 0.5px;">
          ${emailTitle}
        </h1>
        <div style="width: 50px; height: 1px; background-color: rgba(255,255,255,0.4); margin: 0 auto 20px auto;"></div>
        <div style="margin-bottom: 10px;">
          ${bodyLines}
        </div>
      </div>

      <!-- QR Code section -->
      <div style="background-color: #ffffff; padding: 35px 40px 10px 40px; text-align: center;">
        <h2 style="font-size: 16px; font-weight: normal; color: #333333; margin: 0 0 6px 0; letter-spacing: 0.3px;">
          Your Personal QR Code
        </h2>
        <p style="font-size: 13px; color: #888888; margin: 0 0 24px 0;">
          Show this code at the entrance for check-in
        </p>
        <div style="display: inline-block; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; background: #fafafa;">
          <img src="${qrSrc}" alt="QR Code" width="260" height="260" style="display: block; margin: 0 auto;" />
        </div>
        <p style="font-size: 11px; color: #999; margin-top: 14px; font-family: 'Courier New', monospace; word-break: break-all;">
          ID: ${qrCode}
        </p>
      </div>

      <!-- Instructions section -->
      <div style="padding: 10px 40px 30px 40px; text-align: center;">
        <div style="width: 50px; height: 1px; background-color: #ddd; margin: 0 auto 20px auto;"></div>
        <p style="font-size: 13px; color: #666666; margin: 0 0 8px 0; line-height: 1.6;">
          This QR code is personal and non-transferable.
        </p>
        <p style="font-size: 13px; color: #666666; margin: 0; line-height: 1.6;">
          Please save this email or take a screenshot of the QR code for easy access at the event.
        </p>
      </div>

      <!-- Firma Email -->
      ${signatureSection}
    </div>
  `;
}

async function getMailConfig() {
  const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;
  return config;
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

async function getDefaultSignatureHtml(): Promise<string> {
  // Fetch the signatureHtml from the smtp_from_email user, or fallback to first user with a signature
  const cfg = await getMailConfig();
  const fromEmail = cfg.smtp_from_email;

  if (fromEmail) {
    const user = await prisma.adminUser.findFirst({
      where: { email: fromEmail },
      select: { signatureHtml: true },
    });
    if (user?.signatureHtml) return user.signatureHtml;
  }

  // Fallback: first admin user that has a signatureHtml
  const fallback = await prisma.adminUser.findFirst({
    where: { signatureHtml: { not: null } },
    select: { signatureHtml: true },
    orderBy: { createdAt: "asc" },
  });

  return fallback?.signatureHtml || "";
}

export async function sendRegistrationEmailWithConfig(
  toEmail: string,
  firstName: string,
  lastName: string,
  qrCode: string,
  qrDataUrl: string,
  emailConfig: { emailSubject: string; emailTitle: string; emailBody: string; bannerImage?: string }
) {
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const cfg = await getMailConfig();

  const fromName = cfg.smtp_from_name || "GTV";
  const fromEmail = cfg.smtp_from_email || "noreply@localhost";
  const siteUrl = getSiteUrl();

  // Save QR code as file on server for email usage
  const qrFilename = `qr-${qrCode}.png`;
  const qrPath = await generateQRCodeFile(qrCode, qrFilename);
  const qrFullUrl = `${siteUrl}${qrPath}`;

  // Banner URL (make absolute if relative)
  let bannerUrl = emailConfig.bannerImage || "";
  if (bannerUrl && !bannerUrl.startsWith("http")) {
    bannerUrl = `${siteUrl}${bannerUrl}`;
  }

  // Get the standard email signature
  const signatureHtml = await getDefaultSignatureHtml();

  // Prefer Brevo HTTP API
  if (cfg.brevo_api_key) {
    const html = buildRegistrationEmailHtml({
      firstName, lastName, qrCode,
      emailTitle: emailConfig.emailTitle,
      emailBody: emailConfig.emailBody,
      signatureHtml,
      qrImageUrl: qrFullUrl,
      bannerImageUrl: bannerUrl || undefined,
    });

    await sendViaBrevoApi(
      cfg.brevo_api_key, fromName, fromEmail, toEmail,
      emailConfig.emailSubject, html
    );
    return;
  }

  // Fallback: SMTP via nodemailer with CID
  if (!cfg.smtp_host) throw new Error("Email not configured (no Brevo API key or SMTP host)");

  const html = buildRegistrationEmailHtml({
    firstName, lastName, qrCode,
    emailTitle: emailConfig.emailTitle,
    emailBody: emailConfig.emailBody,
    signatureHtml,
    bannerImageUrl: bannerUrl || undefined,
  });

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
    bannerImage: config?.bannerImage || "",
  };
}
