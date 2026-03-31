import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// Admin PUT - update registration (check-in toggle)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("landing_page", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { checkedIn } = body;

    const registration = await prisma.eventRegistration.update({
      where: { id: params.id },
      data: {
        checkedIn: !!checkedIn,
        checkedInAt: checkedIn ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: registration });
  } catch {
    return NextResponse.json(
      { success: false, error: "Registration not found" },
      { status: 404 }
    );
  }
}

// Admin DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePermission("landing_page", "delete");
  if (isErrorResponse(result)) return result;

  try {
    await prisma.eventRegistration.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Registration not found" },
      { status: 404 }
    );
  }
}
