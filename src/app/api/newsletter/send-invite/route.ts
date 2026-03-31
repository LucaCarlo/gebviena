import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { assignTagBySlug } from "@/lib/tags";
import { prisma } from "@/lib/prisma";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import crypto from "crypto";

function getSiteUrl() {
  return process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";
}

export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { emails, templateId, landingPageId, campaign } = await req.json();
    if (!emails?.length) {
      return NextResponse.json({ success: false, error: "Seleziona almeno un destinatario" }, { status: 400 });
    }

    const siteUrl = getSiteUrl();

    // Resolve landing page permalink
    let landingPageUrl = `${siteUrl}/contatti/landing-page`;
    if (landingPageId) {
      const lp = await prisma.landingPageConfig.findUnique({
        where: { id: landingPageId },
        select: { permalink: true },
      });
      if (lp) {
        landingPageUrl = `${siteUrl}/${lp.permalink}`;
      }
    }

    // Load email template if provided
    let template: { subject: string; blocks: string } | null = null;
    if (templateId) {
      template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        select: { subject: true, blocks: true },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();
      const token = crypto.randomUUID();
      const inviteLink = `${landingPageUrl}?inv=${token}`;
      const pixelUrl = `${siteUrl}/api/event-invitations/pixel?token=${token}`;

      // Get subscriber info for template variables
      const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { email: normalizedEmail },
        select: { firstName: true, lastName: true },
      }).catch(() => null);

      let emailHtml: string;
      let emailSubject: string;

      if (template) {
        // Render template with tracking link
        emailHtml = renderEmailTemplate(parseBlocks(template.blocks), {
          firstName: subscriber?.firstName || "",
          lastName: subscriber?.lastName || "",
          email: normalizedEmail,
          eventLink: inviteLink,
        });
        emailSubject = template.subject || "Sei invitato al nostro evento";
        // Substitute eventLink also in subject if used
        emailSubject = emailSubject.replace(/\{\{eventLink\}\}/g, inviteLink);
      } else {
        // Fallback: simple HTML invite
        emailHtml = `
          <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3a5a6a; padding: 35px 40px; text-align: center;">
              <h1 style="font-size: 22px; font-weight: normal; color: #ffffff; margin: 0 0 20px 0;">
                Sei invitato al nostro evento
              </h1>
            </div>
            <div style="padding: 30px 40px; text-align: center;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #3a5a6a; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 16px; border-radius: 6px; font-family: Georgia, serif;">
                Registrati all&rsquo;evento
              </a>
            </div>
          </div>
        `;
        emailSubject = "Sei invitato al nostro evento";
      }

      // Append tracking pixel before closing </body> or at the end
      const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
      if (emailHtml.includes("</body>")) {
        emailHtml = emailHtml.replace("</body>", `${pixelTag}</body>`);
      } else {
        emailHtml += pixelTag;
      }

      const ok = await sendMail(normalizedEmail, emailSubject, emailHtml);
      if (ok) {
        sent++;
        // Create invitation record
        await prisma.eventInvitation.create({
          data: {
            email: normalizedEmail,
            landingPageId: landingPageId || null,
            token,
            campaign: campaign || null,
          },
        }).catch((err) => console.error("Failed to create invitation:", err));
        // Tag the user as "invitato"
        await assignTagBySlug(normalizedEmail, "invitato", "Invitato").catch(() => {});
      } else {
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error("Send invite error:", error);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
