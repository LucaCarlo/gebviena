import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";
import { processImage } from "@/lib/image";
import { isS3Configured, uploadToS3, checkS3Connection } from "@/lib/s3";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const configured = isS3Configured();
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

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({
      success: false,
      error: "Wasabi S3 non configurato. Aggiungi le credenziali nel file .env",
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
        let buffer: Buffer;
        if (file.url.startsWith("/uploads/")) {
          const localPath = path.join(process.cwd(), "public", file.url);
          buffer = await readFile(localPath);
        } else {
          // File might already be on S3, skip
          continue;
        }

        const isImage = file.mimeType.startsWith("image/");
        const key = `${file.folder}/${file.filename}`;

        if (isImage) {
          const { processed, metadata } = await processImage(buffer, "general");
          const wasabiUrl = await uploadToS3(processed, key, "image/webp");

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
