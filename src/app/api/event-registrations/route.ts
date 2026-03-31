import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import {
  generateQRCodeDataUrl,
  sendRegistrationEmailWithConfig,
  getEmailConfig,
} from "@/lib/event-registration";
import { assignTagBySlug } from "@/lib/tags";

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

    const registration = await prisma.eventRegistration.create({
      data: {
        uuid,
        firstName,
        lastName,
        email,
        profile: profile || null,
        country,
        state: state || null,
        city,
        zipCode,
        privacyAccepted: true,
        marketingConsent: !!marketingConsent,
        qrCode,
        landingPageId: landingPageId || null,
        source: invitation ? "invite" : "direct",
      },
    });

    // Link invitation to registration if valid
    if (invitation) {
      await prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: { registrationId: registration.id, registeredAt: new Date() },
      }).catch(() => {});
    }

    const qrDataUrl = await generateQRCodeDataUrl(qrCode);

    // Auto-assign "evento" tag
    assignTagBySlug(email, "evento", "Evento").catch(() => {});

    // Send emails in background
    const emailConfig = await getEmailConfig();
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
