import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import crypto from "crypto";
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

/**
 * Convert data URI (base64) images to files on disk, return absolute URL.
 * Email clients block base64 images, so we need hosted URLs.
 */
async function ensureAbsoluteImageUrl(dataOrUrl: string | null, prefix: string): Promise<string | null> {
  if (!dataOrUrl) return null;
  if (dataOrUrl.startsWith("http")) return dataOrUrl;
  if (!dataOrUrl.startsWith("data:")) {
    return `${getSiteUrl()}${dataOrUrl.startsWith("/") ? "" : "/"}${dataOrUrl}`;
  }
  const match = dataOrUrl.match(/^data:image\/(\w+);base64,([\s\S]+)$/);
  if (!match) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const base64 = match[2];
  const hash = crypto.createHash("md5").update(base64.slice(0, 200)).digest("hex").slice(0, 12);
  const filename = `${prefix}-${hash}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "signatures");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, Buffer.from(base64, "base64"));
  return `${getSiteUrl()}/uploads/signatures/${filename}`;
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

async function getSignatureHtml(signatureTemplateId?: string, signatureUserDataJson?: string): Promise<string> {
  // If a specific signature template + user data is provided, render it directly
  if (signatureTemplateId) {
    const { renderSignature, DEFAULT_USER_DATA, EMPTY_TEMPLATE } = await import("@/app/admin/firma/_components/signatureRenderer");
    const tpl = await prisma.signatureTemplate.findUnique({ where: { id: signatureTemplateId } });
    if (tpl) {
      let userData = { ...DEFAULT_USER_DATA };
      if (signatureUserDataJson) {
        try {
          const parsed = JSON.parse(signatureUserDataJson);
          userData = {
            fullName: parsed.fullName || DEFAULT_USER_DATA.fullName,
            department: parsed.department || DEFAULT_USER_DATA.department,
            infoLine1: parsed.infoLine1 || DEFAULT_USER_DATA.infoLine1,
            infoLine2: parsed.infoLine2 || DEFAULT_USER_DATA.infoLine2,
            address: parsed.address || DEFAULT_USER_DATA.address,
            phone: parsed.phone || DEFAULT_USER_DATA.phone,
            mobile: parsed.mobile || DEFAULT_USER_DATA.mobile,
          };
        } catch { /* use defaults */ }
      }
      // Convert base64 images to hosted files for email compatibility
      const hostedLogoUrl = await ensureAbsoluteImageUrl(tpl.logoUrl, "sig-logo");
      const hostedBannerUrl = await ensureAbsoluteImageUrl(tpl.bannerUrl, "sig-banner");

      const tplData = {
        ...EMPTY_TEMPLATE,
        logoUrl: hostedLogoUrl, bannerUrl: hostedBannerUrl,
        showInstagram: tpl.showInstagram, showFacebook: tpl.showFacebook,
        showWeb: tpl.showWeb, showLinkedin: tpl.showLinkedin, showPinterest: tpl.showPinterest,
        instagramUrl: tpl.instagramUrl, facebookUrl: tpl.facebookUrl,
        webLinkUrl: tpl.webLinkUrl, linkedinUrl: tpl.linkedinUrl, pinterestUrl: tpl.pinterestUrl,
        websiteUrl: tpl.websiteUrl, website: tpl.website,
        disclaimerLang: (tpl.disclaimerLang as "it" | "en" | "both") || "it",
        footerIt: tpl.footerIt, footerEn: tpl.footerEn, ecoText: tpl.ecoText,
        style: (tpl.style as "classic" | "geb" | "geb-gradient") || "geb",
      };
      return renderSignature(userData, tplData);
    }
  }

  // Fallback: fetch from smtp_from_email user or first user with a signature
  const cfg = await getMailConfig();
  const fromEmail = cfg.smtp_from_email;
  if (fromEmail) {
    const user = await prisma.adminUser.findFirst({
      where: { email: fromEmail },
      select: { signatureHtml: true },
    });
    if (user?.signatureHtml) return user.signatureHtml;
  }

  const fallback = await prisma.adminUser.findFirst({
    where: { signatureHtml: { not: null } },
    select: { signatureHtml: true },
    orderBy: { createdAt: "asc" },
  });

  return fallback?.signatureHtml || "";
}

async function getEmailTemplateHtml(emailTemplateId: string, variables: Record<string, string>): Promise<string | null> {
  const { renderEmailTemplate, parseBlocks } = await import("@/lib/email-template-renderer");
  const template = await prisma.emailTemplate.findUnique({ where: { id: emailTemplateId } });
  if (!template) return null;
  return renderEmailTemplate(parseBlocks(template.blocks), variables);
}

export async function sendRegistrationEmailWithConfig(
  toEmail: string,
  firstName: string,
  lastName: string,
  qrCode: string,
  qrDataUrl: string,
  emailConfig: { emailSubject: string; emailTitle: string; emailBody: string; bannerImage?: string; emailTemplateId?: string; signatureTemplateId?: string; signatureUserData?: string }
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

  // Get the signature HTML
  const signatureHtml = await getSignatureHtml(emailConfig.signatureTemplateId, emailConfig.signatureUserData);

  // Build email HTML
  let html: string;

  if (emailConfig.emailTemplateId) {
    // Use block-based email template + append QR code section + signature
    const templateHtml = await getEmailTemplateHtml(emailConfig.emailTemplateId, {
      firstName, lastName, email: toEmail, eventLink: siteUrl,
    });

    if (templateHtml) {
      // Extract body content from template and append QR code
      const qrSection = `
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;">
        <tr><td style="padding:30px 32px 8px;text-align:center;font-size:16px;color:#333;font-family:Georgia,serif;">Your Personal QR Code</td></tr>
        <tr><td style="padding:4px 32px 24px;text-align:center;font-size:13px;color:#888;font-family:Arial,sans-serif;">Show this code at the entrance for check-in</td></tr>
        <tr><td style="text-align:center;padding:0 32px 8px;">
          <div style="display:inline-block;border:1px solid #e5e5e5;border-radius:8px;padding:16px;background:#fafafa;">
            <img src="${qrFullUrl}" alt="QR Code" width="260" height="260" style="display:block;" />
          </div>
        </td></tr>
        <tr><td style="padding:12px 32px 8px;text-align:center;font-size:11px;color:#999;font-family:'Courier New',monospace;">ID: ${qrCode}</td></tr>
        <tr><td style="padding:8px 32px;text-align:center;"><hr style="border:none;border-top:1px solid #e5e5e5;margin:0;" /></td></tr>
        <tr><td style="padding:8px 32px 24px;text-align:center;font-size:13px;color:#666;font-family:Arial,sans-serif;line-height:1.6;">
          This QR code is personal and non-transferable.<br/>Please save this email for easy access at the event.
        </td></tr>
        ${signatureHtml ? `<tr><td style="padding:0 32px 20px;">${signatureHtml}</td></tr>` : ""}
        </table>`;

      // Insert QR section before closing </body>
      html = templateHtml.replace("</body>", `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f4f2;"><tr><td align="center" style="padding:0 0 20px;">${qrSection}</td></tr></table></body>`);
    } else {
      // Template not found, fall back to custom
      html = buildRegistrationEmailHtml({
        firstName, lastName, qrCode,
        emailTitle: emailConfig.emailTitle, emailBody: emailConfig.emailBody,
        signatureHtml, qrImageUrl: qrFullUrl, bannerImageUrl: bannerUrl || undefined,
      });
    }
  } else {
    // Custom title/body mode
    html = buildRegistrationEmailHtml({
      firstName, lastName, qrCode,
      emailTitle: emailConfig.emailTitle, emailBody: emailConfig.emailBody,
      signatureHtml, qrImageUrl: qrFullUrl, bannerImageUrl: bannerUrl || undefined,
    });
  }

  // Send via Brevo or SMTP
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
