import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import { assignTagBySlug } from "@/lib/tags";
import crypto from "crypto";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { subscriberIds, subject, html, templateId, landingPageId } = await req.json();

    if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return NextResponse.json({ success: false, error: "Seleziona almeno un destinatario" }, { status: 400 });
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { id: { in: subscriberIds } },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun destinatario trovato" }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "Oggetto e corpo email richiesti" }, { status: 400 });
    }

    // Enable tracking when a landing page is selected (regardless of template content)
    const enableTracking = !!landingPageId;

    // Resolve landing page URL for tracking
    let landingPageUrl = "";
    const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";
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
        // Generate per-subscriber tracking if enabled
        let eventLink = `${siteUrl}/contatti/landing-page`;
        let pixelTag = "";

        if (enableTracking) {
          const token = crypto.randomUUID();
          eventLink = `${landingPageUrl}?inv=${token}`;
          pixelTag = `<img src="${siteUrl}/api/event-invitations/pixel?token=${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;

          // Create invitation record
          await prisma.eventInvitation.create({
            data: {
              email: sub.email.toLowerCase().trim(),
              landingPageId,
              token,
            },
          }).catch((err) => console.error("Failed to create invitation:", err));
        }

        // Render template with per-subscriber variables
        emailHtml = renderEmailTemplate(parseBlocks(template.blocks), {
          firstName: sub.firstName || "",
          lastName: sub.lastName || "",
          email: sub.email,
          eventLink,
        });

        // Replace any hardcoded landing page URLs in the template with tracked link
        if (enableTracking) {
          emailHtml = emailHtml.replace(/https?:\/\/[^"]*\/contatti\/landing-page/g, eventLink);
          emailHtml = emailHtml.replace(/https?:\/\/[^"]*\/lp\/[^"&]*/g, eventLink);
          // Also replace permalink-based URLs for this specific landing page
          if (landingPageUrl) {
            const baseUrl = landingPageUrl.replace(/\?.*$/, "");
            emailHtml = emailHtml.replace(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?!\\?inv=)", "g"), eventLink);
          }
        }

        // Append tracking pixel
        if (pixelTag) {
          if (emailHtml.includes("</body>")) {
            emailHtml = emailHtml.replace("</body>", `${pixelTag}</body>`);
          } else {
            emailHtml += pixelTag;
          }
        }
      } else {
        emailHtml = html;
      }

      const ok = await sendMail(sub.email, emailSubject, emailHtml);
      if (ok) {
        sent++;
        // Assign "invitato" tag when tracking is enabled
        if (enableTracking) {
          await assignTagBySlug(sub.email.toLowerCase().trim(), "invitato", "Invitato").catch(() => {});
        }
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, total: subscribers.length },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
