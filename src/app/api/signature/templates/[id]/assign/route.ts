import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// POST — assign users to template
// Body: { userIds: string[] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("firma", "edit");
  if (isErrorResponse(result)) return result;

  const { id } = await params;

  try {
    const { userIds } = await req.json();

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ success: false, error: "userIds deve essere un array" }, { status: 400 });
    }

    // First unassign all users currently assigned to this template
    await prisma.adminUser.updateMany({
      where: { signatureTemplateId: id },
      data: { signatureTemplateId: null },
    });

    // Then assign the new set of users
    if (userIds.length > 0) {
      await prisma.adminUser.updateMany({
        where: { id: { in: userIds } },
        data: { signatureTemplateId: id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
