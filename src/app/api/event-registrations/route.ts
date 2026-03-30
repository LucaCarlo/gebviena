import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import QRCode from "qrcode";
import { sendMail } from "@/lib/mail";

function generateUUID(): string {
  return crypto.randomUUID();
}

async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

async function sendRegistrationEmail(
  email: string,
  firstName: string,
  lastName: string,
  qrCode: string,
  qrDataUrl: string
) {
  // Convert data URL to base64 for email embed
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center;">
      <h1 style="font-size: 22px; font-weight: bold; color: #000; margin-bottom: 8px;">
        Registration Confirmed
      </h1>
      <p style="font-size: 16px; color: #000; margin-bottom: 30px;">
        Dear ${firstName} ${lastName}, thank you for registering.
      </p>
      <p style="font-size: 15px; color: #333; margin-bottom: 10px;">
        Please find below your personal QR code to show at the entrance.
      </p>
      <p style="font-size: 13px; color: #666; margin-bottom: 30px;">
        The QR code is personal and can't be shared.
      </p>
      <div style="display: inline-block; border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <img src="cid:qrcode" alt="QR Code" width="250" height="250" style="display: block;" />
      </div>
      <p style="font-size: 11px; color: #999; margin-top: 20px;">
        QR Code ID: ${qrCode}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
      <p style="font-size: 12px; color: #999;">
        Gebrüder Thonet Vienna GmbH<br/>
        Via Foggia 23/H – 10152 Torino (Italy)
      </p>
    </div>
  `;

  try {
    // Use sendMail with inline attachment for QR code
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_host || !cfg.smtp_user) return;

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_secure === "true",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    const fromName = cfg.smtp_from_name || "GTV";
    const fromEmail = cfg.smtp_from_email || cfg.smtp_user;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: "Your Event Registration - QR Code",
      html,
      attachments: [
        {
          filename: "qrcode.png",
          content: Buffer.from(base64Data, "base64"),
          cid: "qrcode",
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send registration email:", error);
  }
}

async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;
  return config;
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

    // Validate required fields
    if (!firstName || !lastName || !email || !country || !city || !zipCode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
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

    // Generate unique QR code
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

    // Generate QR code as data URL (base64 PNG)
    const qrDataUrl = await generateQRCodeDataUrl(qrCode);

    // Send confirmation email with QR code (in background, don't block response)
    sendRegistrationEmail(email, firstName, lastName, qrCode, qrDataUrl).catch(
      (err) => console.error("Registration email failed:", err)
    );

    // Send admin notification (in background)
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

  // CSV export
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
