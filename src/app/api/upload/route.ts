import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { processImage, getWebpFilename, type ImagePurpose } from "@/lib/image";
import { isS3Configured, uploadToS3 } from "@/lib/s3";
import {
  isStreamConfigured, createStreamVideo, uploadStreamVideoBinary,
  waitForStreamReady, buildStreamMp4Url, buildStreamIframeUrl, buildStreamThumbnailUrl,
} from "@/lib/bunny-stream";

export async function POST(req: Request) {
  const result = await requirePermission("media", "create");
  if (isErrorResponse(result)) return result;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const purpose = (formData.get("purpose") as ImagePurpose) || "general";
    const folder = (formData.get("folder") as string) || "general";
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

    const isVideo = file.type.startsWith("video/");

    if (isVideo && (await isStreamConfigured())) {
      // ── VIDEO → VAY Stream (Bunny Video Library) ──
      // 1) Crea video su Bunny (metadata) - restituisce guid
      // 2) Upload binario
      // 3) Attende encoding (finished status) fino a 2 min
      // 4) Salva in MediaFile:
      //    url = MP4 720p diretto (backwards compat con <video src>)
      //    wasabiKey = guid Bunny (per API future)
      //    wasabiUrl = iframe embed URL (per player evoluto)
      //    thumbnailUrl = thumbnail auto-generata da Bunny
      const cleanTitle = file.name.replace(/\.[^.]+$/, "");
      const created = await createStreamVideo(cleanTitle);
      const guid = created.guid;
      await uploadStreamVideoBinary(guid, buffer, file.type);
      const info = await waitForStreamReady(guid, 120_000);

      filename = `${timestamp}-${sanitizedName}`; // reference filename per DB
      finalSize = buffer.length;
      width = info.width || null;
      height = info.height || null;
      // Sceglie la miglior qualità disponibile per url MP4
      const resolutions = (info.availableResolutions || "").split(",").map((r) => r.trim());
      const pref = ["720p", "1080p", "480p", "360p", "240p"];
      const bestQuality = (pref.find((q) => resolutions.includes(q)) || "720p") as "720p" | "1080p" | "480p" | "360p" | "240p";
      url = buildStreamMp4Url(guid, bestQuality);
      wasabiKey = guid; // riusiamo wasabiKey come "external key"
      wasabiUrl = buildStreamIframeUrl(guid);
      thumbnailUrl = buildStreamThumbnailUrl(guid);
      isSynced = true;
    } else if (isImage && !skipCompression) {
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

    // Create MediaFile record so it appears in the Media library
    await prisma.mediaFile.create({
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

    return NextResponse.json({
      success: true,
      data: {
        url,
        name: file.name,
        width,
        height,
        size: finalSize,
        originalSize,
        format: isImage && !skipCompression ? "webp" : (isVideo && wasabiKey ? "stream" : file.type),
      },
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ success: false, error: "Upload fallito" }, { status: 500 });
  }
}
