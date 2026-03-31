import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// POST - check in by QR code value (atomic, safe for concurrent scanners)
export async function POST(req: Request) {
  const result = await requirePermission("landing_page", "view");
  if (isErrorResponse(result)) return result;

  try {
    const { qrCode } = await req.json();

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: "QR code mancante" },
        { status: 400 }
      );
    }

    // Atomic update: only sets checkedIn=true if it was false
    // This prevents race conditions when multiple scanners scan the same QR
    const updated = await prisma.eventRegistration.updateMany({
      where: { qrCode, checkedIn: false },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    if (updated.count > 0) {
      // Successfully checked in
      const registration = await prisma.eventRegistration.findUnique({
        where: { qrCode },
        select: { firstName: true, lastName: true, email: true, profile: true, checkedInAt: true },
      });

      return NextResponse.json({
        success: true,
        alreadyCheckedIn: false,
        data: registration,
      });
    }

    // updateMany matched 0 rows — either QR doesn't exist or already checked in
    const registration = await prisma.eventRegistration.findUnique({
      where: { qrCode },
      select: { firstName: true, lastName: true, email: true, profile: true, checkedIn: true, checkedInAt: true },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: "QR code non valido. Nessuna registrazione trovata." },
        { status: 404 }
      );
    }

    // Already checked in
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
  } catch {
    return NextResponse.json(
      { success: false, error: "Errore server" },
      { status: 500 }
    );
  }
}
