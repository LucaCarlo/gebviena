import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import {
  generateQRCodeDataUrl,
  sendRegistrationEmailWithConfig,
  getEmailConfig,
} from "@/lib/event-registration";

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
      },
    });

    const qrDataUrl = await generateQRCodeDataUrl(qrCode);

    // Send emails in background
    const emailConfig = await getEmailConfig();
    sendRegistrationEmailWithConfig(email, firstName, lastName, qrCode, qrDataUrl, emailConfig).catch(
      (err) => console.error("Registration email failed:", err)
    );
    sendAdminNotification(firstName, lastName, email, profile, country, city).catch(
      (err) => console.error("Admin notification failed:", err)
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

async function sendAdminNotification(
  firstName: string,
  lastName: string,
  email: string,
  profile: string | null,
  country: string,
  city: string
) {
  const adminSetting = await prisma.setting.findUnique({ where: { key: "admin_email" } });
  const adminEmail = adminSetting?.value || process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const html = `
    <h2>Nuova registrazione evento</h2>
    <p><strong>Nome:</strong> ${firstName} ${lastName}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${profile ? `<p><strong>Profilo:</strong> ${profile}</p>` : ""}
    <p><strong>Luogo:</strong> ${city}, ${country}</p>
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      Visualizza tutte le registrazioni nel pannello admin → Registrazioni
    </p>
  `;

  await sendMail(adminEmail, `[GTV] Nuova registrazione: ${firstName} ${lastName}`, html);
}

// Admin GET - list all registrations
export async function GET(req: Request) {
  const result = await requirePermission("registrations", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const format = searchParams.get("format");

  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { qrCode: { contains: search } },
        ],
      }
    : {};

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
