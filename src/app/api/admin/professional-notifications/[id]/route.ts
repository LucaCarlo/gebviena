import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/professional-notifications/[id]
 *   Elimina una singola notifica (e la sua read-tracking via cascade).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("newsletter", "delete");
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  await prisma.professionalNotification.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
