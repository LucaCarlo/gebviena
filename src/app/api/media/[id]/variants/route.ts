import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { isS3Configured, uploadToS3 } from "@/lib/s3";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("media", "edit");
  if (isErrorResponse(result)) return result;

  const media = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!media) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  if (!media.mimeType.startsWith("image/")) {
    return NextResponse.json({ success: false, error: "Non e' un'immagine" }, { status: 400 });
  }

  try {
    // Read the source image - try all possible sources
    let sourceBuffer: Buffer | null = null;

    // Normalize local paths: both /uploads/... and /api/uploads/... map to public/uploads/
    const localPath = media.url.startsWith("/api/uploads/")
      ? media.url.replace("/api/uploads/", "/uploads/")
      : media.url;

    // 1) Try local file
    if (localPath.startsWith("/uploads/")) {
      try {
        const fullPath = path.join(process.cwd(), "public", localPath);
        sourceBuffer = await readFile(fullPath);
      } catch {
        console.log("Variants: local file not found at", localPath);
      }
    }

    // 2) Try wasabi URL
    if (!sourceBuffer && media.wasabiUrl) {
      try {
        const res = await fetch(media.wasabiUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          sourceBuffer = Buffer.from(arrayBuf);
        }
      } catch {
        console.log("Variants: wasabi fetch failed for", media.wasabiUrl);
      }
    }

    // 3) Try url directly if it's a full URL (https://...)
    if (!sourceBuffer && media.url.startsWith("http")) {
      try {
        const res = await fetch(media.url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          sourceBuffer = Buffer.from(arrayBuf);
        }
      } catch {
        console.log("Variants: direct URL fetch failed for", media.url);
      }
    }

    if (!sourceBuffer) {
      return NextResponse.json({
        success: false,
        error: "Impossibile leggere il file sorgente. Verifica che il file esista localmente o su Wasabi.",
      }, { status: 404 });
    }

    // Generate medium (800px)
    const medium = await sharp(sourceBuffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    // Generate thumbnail (400px)
    const thumbnail = await sharp(sourceBuffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Build filenames - ensure webp extension
    const baseName = media.filename.replace(/^(\d+-)/, "").replace(/\.[^.]+$/, "") + ".webp";
    const timestamp = media.filename.match(/^(\d+)-/)?.[1] || String(Date.now());
    const mdName = `${timestamp}-md-${baseName}`;
    const thName = `${timestamp}-thumb-${baseName}`;

    let mediumUrl: string;
    let mediumKey: string | null = null;
    let thumbnailUrl: string;
    let thumbnailKey: string | null = null;

    if (await isS3Configured()) {
      const mdKey = `${media.folder}/${mdName}`;
      mediumUrl = await uploadToS3(medium, mdKey, "image/webp");
      mediumKey = mdKey;

      const thKey = `${media.folder}/thumbs/${thName}`;
      thumbnailUrl = await uploadToS3(thumbnail, thKey, "image/webp");
      thumbnailKey = thKey;
    } else {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      const thumbsDir = path.join(uploadsDir, "thumbs");
      await mkdir(uploadsDir, { recursive: true });
      await mkdir(thumbsDir, { recursive: true });

      await writeFile(path.join(uploadsDir, mdName), medium);
      await writeFile(path.join(thumbsDir, thName), thumbnail);
      mediumUrl = `/uploads/${mdName}`;
      thumbnailUrl = `/uploads/thumbs/${thName}`;
    }

    const data = await prisma.mediaFile.update({
      where: { id: media.id },
      data: {
        mediumUrl,
        mediumKey,
        mediumSize: medium.length,
        thumbnailUrl,
        thumbnailKey,
        thumbnailSize: thumbnail.length,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("Variant generation error:", e);
    return NextResponse.json({
      success: false,
      error: `Generazione varianti fallita: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 });
  }
}
