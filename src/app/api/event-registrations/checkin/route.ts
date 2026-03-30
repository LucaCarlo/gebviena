import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// POST - check in by QR code value
export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { qrCode } = await req.json();

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: "QR code mancante" },
        { status: 400 }
      );
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: { qrCode },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: "QR code non valido. Nessuna registrazione trovata." },
        { status: 404 }
      );
    }

    if (registration.checkedIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        data: {
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          profile: registration.profile,
          checkedInAt: registration.checkedInAt,
        },
      });
    }

    const updated = await prisma.eventRegistration.update({
      where: { qrCode },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      data: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        profile: updated.profile,
        checkedInAt: updated.checkedInAt,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Errore server" },
      { status: 500 }
    );
  }
}
