import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { subscriberIds, subject, html, templateId } = await req.json();

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

    let sent = 0;
    let failed = 0;
    const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://dev.gebruederthonetvienna.com";

    for (const sub of subscribers) {
      let emailHtml: string;

      if (template) {
        // Render template with per-subscriber variables
        emailHtml = renderEmailTemplate(parseBlocks(template.blocks), {
          firstName: sub.firstName || "",
          lastName: sub.lastName || "",
          email: sub.email,
          eventLink: `${siteUrl}/contatti/landing-page`,
        });
      } else {
        emailHtml = html;
      }

      const ok = await sendMail(sub.email, emailSubject, emailHtml);
      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, total: subscribers.length },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
