/**
 * Shared bulk-email sender used by both:
 *  - POST /api/newsletter/send (immediate, manual from admin)
 *  - POST /api/scheduled-emails/process (worker, runs scheduled jobs)
 */
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import crypto from "crypto";

export interface SendBulkParams {
  subscriberIds: string[];
  templateId?: string;
  landingPageId?: string;
  // Used only when no templateId: free-form email
  subject?: string;
  html?: string;
}

export interface SendBulkResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  error?: string;
}

export async function sendBulkNewsletterEmails(params: SendBulkParams): Promise<SendBulkResult> {
  const { subscriberIds, templateId, landingPageId, subject, html } = params;

  if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
    return { success: false, sent: 0, failed: 0, total: 0, error: "Nessun destinatario" };
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { id: { in: subscriberIds } },
  });

  if (subscribers.length === 0) {
    return { success: false, sent: 0, failed: 0, total: 0, error: "Nessun destinatario trovato" };
  }

  // Load template if provided
  let template: { subject: string; blocks: string } | null = null;
  if (templateId) {
    template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      select: { subject: true, blocks: true },
    });
  }

  const emailSubject = subject || template?.subject || "Newsletter";
  if (!html && !template) {
    return { success: false, sent: 0, failed: 0, total: 0, error: "Template o contenuto richiesto" };
  }

  const enableTracking = !!landingPageId;
  const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";
  let landingPageUrl = "";
  if (enableTracking) {
    const lp = await prisma.landingPageConfig.findUnique({
      where: { id: landingPageId },
      select: { permalink: true },
    });
    landingPageUrl = lp ? `${siteUrl}/${lp.permalink}` : `${siteUrl}/contatti/landing-page`;
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    let emailHtml: string;

    if (template) {
      let eventLink = `${siteUrl}/contatti/landing-page`;
      let pixelTag = "";

      if (enableTracking) {
        const token = crypto.randomUUID();
        eventLink = `${landingPageUrl}?inv=${token}`;
        pixelTag = `<img src="${siteUrl}/api/event-invitations/pixel?token=${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;

        await prisma.eventInvitation.create({
          data: {
            email: sub.email.toLowerCase().trim(),
            landingPageId,
            token,
          },
        }).catch((err) => console.error("Failed to create invitation:", err));
      }

      emailHtml = renderEmailTemplate(parseBlocks(template.blocks), {
        firstName: sub.firstName || "",
        lastName: sub.lastName || "",
        email: sub.email,
        eventLink,
      });

      if (enableTracking) {
        emailHtml = emailHtml.replace(/https?:\/\/[^"]*\/contatti\/landing-page/g, eventLink);
        emailHtml = emailHtml.replace(/https?:\/\/[^"]*\/lp\/[^"&]*/g, eventLink);
        if (landingPageUrl) {
          const baseUrl = landingPageUrl.replace(/\?.*$/, "");
          emailHtml = emailHtml.replace(
            new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?!\\?inv=)", "g"),
            eventLink
          );
        }
      }

      if (pixelTag) {
        emailHtml = emailHtml.includes("</body>")
          ? emailHtml.replace("</body>", `${pixelTag}</body>`)
          : emailHtml + pixelTag;
      }
    } else {
      emailHtml = html!;
    }

    const ok = await sendMail(sub.email, emailSubject, emailHtml);
    if (ok) sent++; else failed++;
  }

  return { success: true, sent, failed, total: subscribers.length };
}
