import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { invalidateBlocklistCache } from "@/lib/security";

export const dynamic = "force-dynamic";

// DELETE: sblocca un IP (elimina dalla blocklist)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const authErr = await requirePermission("settings", "edit");
  if (isErrorResponse(authErr)) return authErr;
  await prisma.blockedIp.delete({ where: { id: params.id } }).catch(() => null);
  invalidateBlocklistCache();
  return NextResponse.json({ success: true });
}
