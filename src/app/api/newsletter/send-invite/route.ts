import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { assignTagBySlug } from "@/lib/tags";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function getSiteUrl() {
  return process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";
}

export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { emails, subject, message, landingPageId, campaign } = await req.json();
    if (!emails?.length) {
      return NextResponse.json({ success: false, error: "Seleziona almeno un destinatario" }, { status: 400 });
    }

    const siteUrl = getSiteUrl();

    // Resolve landing page permalink if provided
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

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      // Generate unique invitation token
      const token = crypto.randomUUID();

      // Build the personalized link with token
      const inviteLink = `${landingPageUrl}?inv=${token}`;
      const pixelUrl = `${siteUrl}/api/event-invitations/pixel?token=${token}`;

      const html = `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3a5a6a; padding: 35px 40px; text-align: center;">
            <h1 style="font-size: 22px; font-weight: normal; color: #ffffff; margin: 0 0 20px 0;">
              ${subject || "Sei invitato al nostro evento"}
            </h1>
            <div style="font-size: 15px; color: #ffffff; font-style: italic; line-height: 1.6;">
              ${(message || "Siamo lieti di invitarti al nostro prossimo evento. Registrati per ricevere il tuo QR code personale.").replace(/\n/g, "<br/>")}
            </div>
          </div>
          <div style="padding: 30px 40px; text-align: center;">
            <a href="${inviteLink}" style="display: inline-block; background-color: #3a5a6a; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 16px; border-radius: 6px; font-family: Georgia, serif;">
              Registrati all&rsquo;evento
            </a>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              Cliccando il pulsante verrai reindirizzato alla pagina di registrazione dove potrai ottenere il tuo QR code personale.
            </p>
          </div>
          <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
        </div>
      `;

      const ok = await sendMail(email, subject || "Sei invitato al nostro evento", html);
      if (ok) {
        sent++;
        // Create invitation record
        await prisma.eventInvitation.create({
          data: {
            email: email.toLowerCase().trim(),
            landingPageId: landingPageId || null,
            token,
            campaign: campaign || null,
          },
        }).catch(() => {});
        // Tag the user as "invitato"
        assignTagBySlug(email, "invitato", "Invitato").catch(() => {});
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
