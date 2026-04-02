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

interface EmailFooterConfig {
  showInstagram?: boolean;
  showFacebook?: boolean;
  showLinkedin?: boolean;
  showPinterest?: boolean;
  showWeb?: boolean;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  pinterestUrl?: string;
  webUrl?: string;
  line1?: string;
  line2?: string;
  line3?: string;
}

function buildEmailFooterHtml(footer: EmailFooterConfig): string {
  const icons: string[] = [];

  if (footer.showInstagram && footer.instagramUrl) {
    icons.push(`<a href="${footer.instagramUrl}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;color:#333333;font-size:13px;">Instagram</a>`);
  }
  if (footer.showFacebook && footer.facebookUrl) {
    icons.push(`<a href="${footer.facebookUrl}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;color:#333333;font-size:13px;">Facebook</a>`);
  }
  if (footer.showLinkedin && footer.linkedinUrl) {
    icons.push(`<a href="${footer.linkedinUrl}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;color:#333333;font-size:13px;">LinkedIn</a>`);
  }
  if (footer.showPinterest && footer.pinterestUrl) {
    icons.push(`<a href="${footer.pinterestUrl}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;color:#333333;font-size:13px;">Pinterest</a>`);
  }
  if (footer.showWeb && footer.webUrl) {
    icons.push(`<a href="${footer.webUrl}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;color:#333333;font-size:13px;">Web</a>`);
  }

  const lines: string[] = [];
  if (footer.line1) lines.push(`<p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#333333;margin:0 0 4px 0;font-weight:600;">${footer.line1}</p>`);
  if (footer.line2) lines.push(`<p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#666666;margin:0 0 2px 0;">${footer.line2}</p>`);
  if (footer.line3) lines.push(`<p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#666666;margin:0;">${footer.line3}</p>`);

  if (icons.length === 0 && lines.length === 0) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr><td style="padding:0 40px;">
        <hr style="border:none;border-top:1px solid #1a1a1a;margin:0;" />
      </td></tr>
      ${icons.length > 0 ? `<tr><td style="padding:20px 40px 12px;text-align:center;">${icons.join('<span style="color:#cccccc;margin:0 2px;">|</span>')}</td></tr>` : ""}
      ${lines.length > 0 ? `<tr><td style="padding:${icons.length > 0 ? "0" : "20px"} 40px 24px;text-align:center;">${lines.join("")}</td></tr>` : ""}
    </table>`;
}

export function buildRegistrationEmailHtml(opts: {
  firstName: string;
  lastName: string;
  qrCode: string;
  emailTitle: string;
  emailBody: string;
  qrImageUrl?: string;
  bannerImageUrl?: string;
  footerHtml?: string;
}): string {
  const { firstName, lastName, qrCode, emailTitle, emailBody, qrImageUrl, bannerImageUrl, footerHtml } = opts;

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

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      ${bannerSection}
      <div style="background-color: #3a5a6a; padding: 35px 40px 25px 40px; text-align: center;">
        <h1 style="font-size: 22px; font-weight: normal; color: #ffffff; margin: 0 0 8px 0; letter-spacing: 0.5px;">
          ${emailTitle}
        </h1>
        <div style="width: 50px; height: 1px; background-color: rgba(255,255,255,0.4); margin: 0 auto 20px auto;"></div>
        <div style="margin-bottom: 10px;">
          ${bodyLines}
        </div>
      </div>
      <div style="background-color: #ffffff; padding: 35px 40px 10px 40px; text-align: center;">
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
      <div style="padding: 10px 40px 30px 40px; text-align: center;">
        <div style="width: 50px; height: 1px; background-color: #ddd; margin: 0 auto 20px auto;"></div>
        <p style="font-size: 13px; color: #666666; margin: 0 0 8px 0; line-height: 1.6;">
          This QR code is personal and non-transferable.
        </p>
        <p style="font-size: 13px; color: #666666; margin: 0; line-height: 1.6;">
          Please save this email or take a screenshot of the QR code for easy access at the event.
        </p>
      </div>
      ${footerHtml || ""}
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
  apiKey: string, fromName: string, fromEmail: string,
  toEmail: string, subject: string, html: string
) {
  const body = JSON.stringify({
    sender: { name: fromName, email: fromEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
  });
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${err}`);
  }
  return res.json();
}

function getEmailFooterConfig(emailFooterJson: string | null): EmailFooterConfig {
  if (!emailFooterJson) return {};
  try { return JSON.parse(emailFooterJson); } catch { return {}; }
}

async function getEmailTemplateHtml(emailTemplateId: string, variables: Record<string, string>): Promise<string | null> {
  const { renderEmailTemplate, parseBlocks } = await import("@/lib/email-template-renderer");
  const template = await prisma.emailTemplate.findUnique({ where: { id: emailTemplateId } });
  if (!template) return null;
  return renderEmailTemplate(parseBlocks(template.blocks), variables);
}

export async function sendRegistrationEmailWithConfig(
  toEmail: string, firstName: string, lastName: string,
  qrCode: string, qrDataUrl: string,
  emailConfig: {
    emailSubject: string; emailTitle: string; emailBody: string;
    bannerImage?: string; emailTemplateId?: string;
    emailFooter?: string;
    signatureTemplateId?: string; signatureUserData?: string;
  }
) {
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const cfg = await getMailConfig();
  const fromName = cfg.smtp_from_name || "GTV";
  const fromEmail = cfg.smtp_from_email || "noreply@localhost";
  const siteUrl = getSiteUrl();

  const qrFilename = `qr-${qrCode}.png`;
  const qrPath = await generateQRCodeFile(qrCode, qrFilename);
  const qrFullUrl = `${siteUrl}${qrPath}`;

  let bannerUrl = emailConfig.bannerImage || "";
  if (bannerUrl && !bannerUrl.startsWith("http")) {
    bannerUrl = `${siteUrl}${bannerUrl}`;
  }

  // Build email footer from config
  const footerConfig = getEmailFooterConfig(emailConfig.emailFooter || null);
  const footerHtml = buildEmailFooterHtml(footerConfig);

  let html: string;

  if (emailConfig.emailTemplateId) {
    const templateHtml = await getEmailTemplateHtml(emailConfig.emailTemplateId, {
      firstName, lastName, email: toEmail, eventLink: siteUrl,
    });

    if (templateHtml) {
      const qrSection = `
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;">
        <tr><td style="padding:30px 32px 8px;text-align:center;font-size:13px;color:#888;font-family:Arial,sans-serif;">Show this code at the entrance for check-in</td></tr>
        <tr><td style="text-align:center;padding:0 32px 8px;">
          <div style="display:inline-block;border:1px solid #e5e5e5;border-radius:8px;padding:16px;background:#fafafa;">
            <img src="${qrFullUrl}" alt="QR Code" width="260" height="260" style="display:block;" />
          </div>
        </td></tr>
        <tr><td style="padding:12px 32px 8px;text-align:center;font-size:11px;color:#999;font-family:'Courier New',monospace;">ID: ${qrCode}</td></tr>
        <tr><td style="padding:8px 32px 24px;text-align:center;font-size:13px;color:#666;font-family:Arial,sans-serif;line-height:1.6;">
          This QR code is personal and non-transferable.<br/>Please save this email for easy access at the event.
        </td></tr>
        ${footerHtml ? `<tr><td style="padding:0;">${footerHtml}</td></tr>` : ""}
        </table>`;

      html = templateHtml.replace("</body>", `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f4f2;"><tr><td align="center" style="padding:0 0 20px;">${qrSection}</td></tr></table></body>`);
    } else {
      html = buildRegistrationEmailHtml({
        firstName, lastName, qrCode,
        emailTitle: emailConfig.emailTitle, emailBody: emailConfig.emailBody,
        qrImageUrl: qrFullUrl, bannerImageUrl: bannerUrl || undefined,
        footerHtml,
      });
    }
  } else {
    html = buildRegistrationEmailHtml({
      firstName, lastName, qrCode,
      emailTitle: emailConfig.emailTitle, emailBody: emailConfig.emailBody,
      qrImageUrl: qrFullUrl, bannerImageUrl: bannerUrl || undefined,
      footerHtml,
    });
  }

  if (cfg.brevo_api_key) {
    await sendViaBrevoApi(cfg.brevo_api_key, fromName, fromEmail, toEmail, emailConfig.emailSubject, html);
    return;
  }

  if (!cfg.smtp_host) throw new Error("Email not configured (no Brevo API key or SMTP host)");

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
