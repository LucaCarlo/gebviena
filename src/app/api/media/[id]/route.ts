import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { unlink } from "fs/promises";
import path from "path";
import { isS3Configured, deleteFromS3 } from "@/lib/s3";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("media", "delete");
  if (isErrorResponse(result)) return result;

  const media = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!media) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  // Delete from S3 if synced
  if (media.wasabiKey && (await isS3Configured())) {
    try {
      await deleteFromS3(media.wasabiKey);
    } catch {
      // Continue with cleanup even if S3 delete fails
    }
  }

  // Delete local file
  if (media.url.startsWith("/uploads/")) {
    try {
      const filepath = path.join(process.cwd(), "public", media.url);
      await unlink(filepath);
    } catch {
      // File may already be deleted
    }
  }

  await prisma.mediaFile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
