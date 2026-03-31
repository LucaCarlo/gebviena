import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import {
  generateQRCodeDataUrl,
  sendRegistrationEmailWithConfig,
} from "@/lib/event-registration";

export async function POST(req: Request) {
  const result = await requirePermission("landing_page", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { testEmail, emailSubject, emailTitle, emailBody, bannerImage } = body;

    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: "Email di prova obbligatoria" },
        { status: 400 }
      );
    }

    const testQrCode = "TEST-QR-" + crypto.randomUUID().slice(0, 8);
    const qrDataUrl = await generateQRCodeDataUrl(testQrCode);

    await sendRegistrationEmailWithConfig(
      testEmail,
      "Mario",
      "Rossi",
      testQrCode,
      qrDataUrl,
      {
        emailSubject: emailSubject || "Your Event Registration - QR Code",
        emailTitle: emailTitle || "Registration Confirmed",
        emailBody: emailBody || "Thank you for registering.",
        bannerImage: bannerImage || "",
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Test email error:", error);
    const message = error instanceof Error ? error.message : "Errore invio email";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
