import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import {
  generateQRCodeDataUrl,
  sendRegistrationEmailWithConfig,
  getEmailConfig,
} from "@/lib/event-registration";
import { assignTagBySlug } from "@/lib/tags";
import { sendCapiEvent } from "@/lib/fb-capi";
import { headers } from "next/headers";

function generateUUID(): string {
  return crypto.randomUUID();
}

// Public POST - register for event
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      profile,
      company,
      phone,
      country,
      state,
      city,
      zipCode,
      privacyAccepted,
      marketingConsent,
      landingPageId,
      inviteToken,
    } = body;

    if (!firstName || !lastName || !email || !country || !city || !zipCode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check for duplicate registration
    const existing = await prisma.eventRegistration.findFirst({
      where: { email: email.toLowerCase().trim(), landingPageId: landingPageId || undefined },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You are already registered for this event" },
        { status: 409 }
      );
    }

    if (!privacyAccepted) {
      return NextResponse.json(
        { success: false, error: "Privacy policy must be accepted" },
        { status: 400 }
      );
    }

    const qrCode = generateUUID();
    const uuid = generateUUID();

    // Check if there's a valid invitation token
    let invitation = null;
    if (inviteToken) {
      invitation = await prisma.eventInvitation.findUnique({
        where: { token: inviteToken },
        select: { id: true, registrationId: true },
      });
      // Only use if not already linked to another registration
      if (invitation?.registrationId) invitation = null;
    }

    // Lingua del visitatore: il middleware skippa /api/* quindi non setta
    // l'header sulla request al backend. Il client passa la lingua nel body.
    const bodyLang = typeof body.lang === "string" ? body.lang.trim().toLowerCase() : "";
    const headerLang = (() => {
      try { return (headers().get("x-gtv-lang") || "").toLowerCase(); } catch { return ""; }
    })();
    const KNOWN = new Set(["it", "en", "de", "fr", "es"]);
    const userLang = KNOWN.has(bodyLang) ? bodyLang : (KNOWN.has(headerLang) ? headerLang : "it");

    const registration = await prisma.eventRegistration.create({
      data: {
        uuid,
        firstName,
        lastName,
        email,
        profile: profile || null,
        company: company || null,
        phone: phone || null,
        country,
        state: state || null,
        city,
        zipCode,
        privacyAccepted: true,
        marketingConsent: !!marketingConsent,
        qrCode,
        landingPageId: landingPageId || null,
        source: invitation ? "invite" : "direct",
        languageCode: userLang,
      },
    });

    // Meta CAPI: Lead server-side per ogni registrazione evento
    // event_id condiviso col pixel client = `lead-event-${registration.id}`.
    {
      const h = headers();
      const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      const clientUserAgent = h.get("user-agent") || null;
      sendCapiEvent({
        eventName: "Lead",
        eventId: `lead-event-${registration.id}`,
        actionSource: "website",
        userData: {
          email,
          phone: phone || null,
          firstName: firstName || null,
          lastName: lastName || null,
          city: city || null,
          postalCode: zipCode || null,
          country: country || null,
          clientIp,
          clientUserAgent,
        },
        customData: {
          content_name: "landing-page-event",
          content_category: "event_registration",
        },
      }).catch((err) => console.error("[event-registrations] sendCapiEvent Lead error:", err));
    }

    // Link invitation to registration if valid
    if (invitation) {
      await prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: { registrationId: registration.id, registeredAt: new Date() },
      }).catch(() => {});
    }

    const qrDataUrl = await generateQRCodeDataUrl(qrCode);

    // Auto-assign event-specific tag (from LP tagSlug, fallback to "evento")
    if (landingPageId) {
      const lpTag = await prisma.landingPageConfig.findUnique({ where: { id: landingPageId }, select: { tagSlug: true, name: true } });
      if (lpTag?.tagSlug) {
        assignTagBySlug(email, lpTag.tagSlug, lpTag.name || "Evento").catch(() => {});
      } else {
        assignTagBySlug(email, "evento", "Evento").catch(() => {});
      }
    } else {
      assignTagBySlug(email, "evento", "Evento").catch(() => {});
    }

    // Riusa la lingua già rilevata sopra per le traduzioni email
    const lang = userLang;

    // Get email config from the specific landing page, fallback to default
    let emailConfig: { emailSubject: string; emailTitle: string; emailBody: string; bannerImage: string; emailTemplateId?: string; emailFooter?: string; signatureTemplateId?: string; signatureUserData?: string };
    if (landingPageId) {
      const lp = await prisma.landingPageConfig.findUnique({
        where: { id: landingPageId },
        select: { emailSubject: true, emailTitle: true, emailBody: true, bannerImage: true, emailTemplateId: true, emailFooter: true, signatureTemplateId: true, signatureUserData: true },
      });
      if (lp) {
        // Override email fields/template con la traduzione se la lingua dell'utente non è IT
        let trEmailSubject: string | null = null;
        let trEmailTitle: string | null = null;
        let trEmailBody: string | null = null;
        let trEmailTemplateId: string | null = null;
        if (lang !== "it") {
          const tr = await prisma.landingPageConfigTranslation.findUnique({
            where: { landingPageId_languageCode: { landingPageId, languageCode: lang } },
            select: { emailSubject: true, emailTitle: true, emailBody: true, emailTemplateId: true },
          });
          trEmailSubject = tr?.emailSubject?.trim() || null;
          trEmailTitle = tr?.emailTitle?.trim() || null;
          trEmailBody = tr?.emailBody?.trim() || null;
          trEmailTemplateId = tr?.emailTemplateId?.trim() || null;
        }
        emailConfig = {
          emailSubject: trEmailSubject || lp.emailSubject || "Your Event Registration",
          emailTitle: trEmailTitle || lp.emailTitle || "Registration Confirmed",
          emailBody: trEmailBody || lp.emailBody || "",
          bannerImage: lp.bannerImage || "",
          emailTemplateId: trEmailTemplateId || lp.emailTemplateId || undefined,
          emailFooter: lp.emailFooter || undefined,
          signatureTemplateId: lp.signatureTemplateId || undefined,
          signatureUserData: lp.signatureUserData || undefined,
        };
      } else {
        emailConfig = await getEmailConfig();
      }
    } else {
      emailConfig = await getEmailConfig();
    }

    // Send emails in background
    sendRegistrationEmailWithConfig(email, firstName, lastName, qrCode, qrDataUrl, emailConfig).catch(
      (err) => console.error("Registration email failed:", err)
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: registration.id,
          uuid: registration.uuid,
          qrCode: registration.qrCode,
          qrDataUrl,
          firstName: registration.firstName,
          lastName: registration.lastName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Event registration error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// Admin GET - list all registrations
export async function GET(req: Request) {
  const result = await requirePermission("landing_page", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const format = searchParams.get("format");
  const lpId = searchParams.get("landingPageId");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { qrCode: { contains: search } },
    ];
  }
  if (lpId) {
    where.landingPageId = lpId;
  }

  const data = await prisma.eventRegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const header =
      "ID,UUID,First Name,Last Name,Email,Profile,Country,State,City,ZIP,Privacy,Marketing,QR Code,Checked In,Checked In At,Created At";
    const rows = data.map(
      (r) =>
        `"${r.id}","${r.uuid}","${r.firstName}","${r.lastName}","${r.email}","${r.profile || ""}","${r.country}","${r.state || ""}","${r.city}","${r.zipCode}","${r.privacyAccepted}","${r.marketingConsent}","${r.qrCode}","${r.checkedIn}","${r.checkedInAt || ""}","${r.createdAt.toISOString()}"`
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ success: true, data, total: data.length });
}
