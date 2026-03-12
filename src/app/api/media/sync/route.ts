import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { readFile } from "fs/promises";
import path from "path";
import { processImage } from "@/lib/image";
import { isS3Configured, uploadToS3, checkS3Connection } from "@/lib/s3";

export async function GET() {
  const result = await requirePermission("media", "view");
  if (isErrorResponse(result)) return result;

  const configured = await isS3Configured();
  let connected = false;
  if (configured) {
    connected = await checkS3Connection();
  }

  const [total, synced, unsynced] = await Promise.all([
    prisma.mediaFile.count(),
    prisma.mediaFile.count({ where: { isSynced: true } }),
    prisma.mediaFile.count({ where: { isSynced: false } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { configured, connected, total, synced, unsynced },
  });
}

async function readLocalFile(url: string): Promise<Buffer | null> {
  // Normalize: /api/uploads/... → /uploads/...
  const normalized = url.startsWith("/api/uploads/")
    ? url.replace("/api/uploads/", "/uploads/")
    : url;
  if (!normalized.startsWith("/uploads/")) return null;
  try {
    const localPath = path.join(process.cwd(), "public", normalized);
    return await readFile(localPath);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const result = await requirePermission("media", "edit");
  if (isErrorResponse(result)) return result;

  if (!(await isS3Configured())) {
    return NextResponse.json({
      success: false,
      error: "Wasabi S3 non configurato. Aggiungi le credenziali nelle Impostazioni → Storage Cloud",
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || [];

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun file selezionato" }, { status: 400 });
    }

    const files = await prisma.mediaFile.findMany({
      where: { id: { in: ids } },
    });

    let synced = 0;
    let failed = 0;

    for (const file of files) {
      try {
        // Read local file
        const buffer = await readLocalFile(file.url);
        if (!buffer) {
          // File might already be on S3, skip
          continue;
        }

        const isImage = file.mimeType.startsWith("image/");
        const key = `${file.folder}/${file.filename}`;

        if (isImage) {
          const { processed, medium, thumbnail, metadata } = await processImage(buffer, "general");
          const wasabiUrl = await uploadToS3(processed, key, "image/webp");

          // Sync medium variant
          const mdFilename = file.filename.replace(/^(\d+-)/, "$1md-");
          const mdKey = `${file.folder}/${mdFilename}`;
          const mediumUrl = await uploadToS3(medium, mdKey, "image/webp");

          // Sync thumbnail variant
          const thFilename = file.filename.replace(/^(\d+-)/, "$1thumb-");
          const thKey = `${file.folder}/thumbs/${thFilename}`;
          const thumbnailUrl = await uploadToS3(thumbnail, thKey, "image/webp");

          await prisma.mediaFile.update({
            where: { id: file.id },
            data: {
              wasabiUrl,
              wasabiKey: key,
              isSynced: true,
              syncedAt: new Date(),
              width: metadata.width,
              height: metadata.height,
              size: metadata.size,
              originalSize: metadata.originalSize,
              mediumUrl,
              mediumKey: mdKey,
              mediumSize: medium.length,
              thumbnailUrl,
              thumbnailKey: thKey,
              thumbnailSize: thumbnail.length,
            },
          });
        } else {
          const wasabiUrl = await uploadToS3(buffer, key, file.mimeType);

          await prisma.mediaFile.update({
            where: { id: file.id },
            data: {
              wasabiUrl,
              wasabiKey: key,
              isSynced: true,
              syncedAt: new Date(),
            },
          });
        }

        synced++;
      } catch (e) {
        console.error(`Sync failed for ${file.id}:`, e);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { synced, failed, total: files.length },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
