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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("media", "edit");
  if (isErrorResponse(result)) return result;

  const media = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!media) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.altText === "string") {
    updateData.altText = body.altText;
  }

  if (typeof body.folder === "string") {
    updateData.folder = body.folder;
  }

  const data = await prisma.mediaFile.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({ success: true, data });
}

async function tryDeleteLocal(url: string | null) {
  if (!url) return;
  // Normalize: /api/uploads/... → /uploads/...
  const normalized = url.startsWith("/api/uploads/")
    ? url.replace("/api/uploads/", "/uploads/")
    : url;
  if (!normalized.startsWith("/uploads/")) return;
  try {
    const filepath = path.join(process.cwd(), "public", normalized);
    await unlink(filepath);
  } catch {
    // File may already be deleted
  }
}

async function tryDeleteS3(key: string | null | undefined) {
  if (!key) return;
  try {
    if (await isS3Configured()) {
      await deleteFromS3(key);
    }
  } catch {
    // Continue cleanup even if S3 delete fails
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("media", "delete");
  if (isErrorResponse(result)) return result;

  const media = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!media) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  // Delete main file from S3 and local
  await tryDeleteS3(media.wasabiKey);
  await tryDeleteLocal(media.url);

  // Delete variant files (medium + thumbnail)
  await tryDeleteS3(media.mediumKey);
  await tryDeleteLocal(media.mediumUrl);

  await tryDeleteS3(media.thumbnailKey);
  await tryDeleteLocal(media.thumbnailUrl);

  await prisma.mediaFile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
