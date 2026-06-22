import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { deleteFromS3 } from "@/lib/s3";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("products", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;

  const rec = await prisma.professionalImage.findUnique({ where: { id } });
  if (!rec) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  try {
    if (rec.storage === "wasabi") {
      // Estrae la key dall'URL completo (endpoint/bucket/key)
      try {
        const u = new URL(rec.fileUrl);
        const key = u.pathname.split("/").slice(2).join("/"); // skip /bucket/
        if (key) await deleteFromS3(key);
      } catch { /* silent */ }
    } else if (rec.fileUrl.startsWith("/uploads/")) {
      try {
        await unlink(path.join(process.cwd(), "public", rec.fileUrl.replace(/^\//, "")));
      } catch { /* file mancante, ok */ }
    }
  } catch { /* silent */ }

  await prisma.professionalImage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("products", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;
  const body = await req.json();
  const data: { sortOrder?: number; isActive?: boolean } = {};
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  const rec = await prisma.professionalImage.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: rec });
}
