import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { processImage, getWebpFilename, type ImagePurpose } from "@/lib/image";
import { isS3Configured, uploadToS3 } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const result = await requirePermission("media", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (folder) where.folder = folder;
  if (search) {
    where.originalName = { contains: search };
  }

  const data = await prisma.mediaFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("media", "create");
  if (isErrorResponse(result)) return result;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "general";
    const purpose = (formData.get("purpose") as ImagePurpose) || "general";
    const skipCompression = formData.get("skipCompression") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "Nessun file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isImage = file.type.startsWith("image/");
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    let url: string;
    let wasabiUrl: string | null = null;
    let wasabiKey: string | null = null;
    let isSynced = false;
    let filename: string;
    let width: number | null = null;
    let height: number | null = null;
    let finalSize: number;
    let originalSize: number | null = null;

    // Variant tracking
    let thumbnailUrl: string | null = null;
    let thumbnailKey: string | null = null;
    let thumbnailSize: number | null = null;
    let mediumUrl: string | null = null;
    let mediumKey: string | null = null;
    let mediumSize: number | null = null;

    if (isImage && !skipCompression) {
      const { processed, medium, thumbnail, metadata } = await processImage(buffer, purpose);
      const webpName = getWebpFilename(sanitizedName);
      filename = `${timestamp}-${webpName}`;
      finalSize = metadata.size;
      width = metadata.width;
      height = metadata.height;
      originalSize = metadata.originalSize;
      thumbnailSize = thumbnail.length;
      mediumSize = medium.length;

      const mdName = `${timestamp}-md-${webpName}`;
      const thName = `${timestamp}-thumb-${webpName}`;

      if (await isS3Configured()) {
        const key = `${folder}/${filename}`;
        wasabiUrl = await uploadToS3(processed, key, "image/webp");
        wasabiKey = key;
        isSynced = true;
        url = wasabiUrl;

        const mdKey = `${folder}/${mdName}`;
        mediumUrl = await uploadToS3(medium, mdKey, "image/webp");
        mediumKey = mdKey;

        const thKey = `${folder}/thumbs/${thName}`;
        thumbnailUrl = await uploadToS3(thumbnail, thKey, "image/webp");
        thumbnailKey = thKey;
      } else {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        const thumbsDir = path.join(uploadsDir, "thumbs");
        await mkdir(uploadsDir, { recursive: true });
        await mkdir(thumbsDir, { recursive: true });

        await writeFile(path.join(uploadsDir, filename), processed);
        await writeFile(path.join(uploadsDir, mdName), medium);
        await writeFile(path.join(thumbsDir, thName), thumbnail);
        url = `/uploads/${filename}`;
        mediumUrl = `/uploads/${mdName}`;
        thumbnailUrl = `/uploads/thumbs/${thName}`;
      }
    } else if (isImage && skipCompression) {
      filename = `${timestamp}-${sanitizedName}`;
      finalSize = buffer.length;
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buffer).metadata();
      width = meta.width || null;
      height = meta.height || null;

      if (await isS3Configured()) {
        const key = `${folder}/${filename}`;
        wasabiUrl = await uploadToS3(buffer, key, file.type);
        wasabiKey = key;
        isSynced = true;
        url = wasabiUrl;
      } else {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, filename), buffer);
        url = `/uploads/${filename}`;
      }
    } else {
      filename = `${timestamp}-${sanitizedName}`;
      finalSize = buffer.length;

      if (await isS3Configured()) {
        const key = `${folder}/${filename}`;
        wasabiUrl = await uploadToS3(buffer, key, file.type);
        wasabiKey = key;
        isSynced = true;
        url = wasabiUrl;
      } else {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, filename), buffer);
        url = `/uploads/${filename}`;
      }
    }

    const data = await prisma.mediaFile.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: isImage && !skipCompression ? "image/webp" : file.type,
        size: finalSize,
        url,
        wasabiUrl,
        wasabiKey,
        isSynced,
        syncedAt: isSynced ? new Date() : null,
        folder,
        width,
        height,
        originalSize,
        thumbnailUrl,
        thumbnailKey,
        thumbnailSize,
        mediumUrl,
        mediumKey,
        mediumSize,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
