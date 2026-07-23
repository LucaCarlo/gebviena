// Script di sync VAY: chiama la stessa logica dell'endpoint POST /api/media/sync
// ma senza serverless overhead + autenticazione (siamo dentro il server).
// Args: --folder=hero  oppure  --ids=id1,id2  oppure  --all
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const prisma = new PrismaClient();

// Argomenti
const args = process.argv.slice(2);
const folderArg = args.find(a => a.startsWith("--folder="))?.slice(9);
const idsArg = args.find(a => a.startsWith("--ids="))?.slice(6);
const doAll = args.includes("--all");
const limit = parseInt(args.find(a => a.startsWith("--limit="))?.slice(8) || "0", 10);
const dryRun = args.includes("--dry-run");

if (!folderArg && !idsArg && !doAll) {
  console.error("Usage: node vay-sync.mjs --folder=hero  |  --ids=id1,id2  |  --all  [--limit=N] [--dry-run]");
  process.exit(1);
}

// Config VAY dal DB
const settings = await prisma.setting.findMany({ where: { group: "storage" } });
const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
if (cfg.bunny_enabled !== "true") { console.error("VAY non attivo"); process.exit(1); }

const s3 = new S3Client({
  region: cfg.bunny_region,
  endpoint: cfg.bunny_endpoint,
  credentials: {
    accessKeyId: cfg.bunny_access_key,
    secretAccessKey: cfg.bunny_secret_key,
  },
  forcePathStyle: true,
});
const bucket = cfg.bunny_storage_zone;
const cdnBase = (cfg.bunny_cdn_url || "").replace(/\/$/, "");
console.log(`[cfg] bucket=${bucket} cdn=${cdnBase || "(none, proxy fallback)"}\n`);

// Query MediaFile
let where;
if (folderArg) where = { folder: folderArg, isSynced: false };
else if (idsArg) where = { id: { in: idsArg.split(",") } };
else where = { isSynced: false };

const files = await prisma.mediaFile.findMany({
  where,
  ...(limit ? { take: limit } : {}),
});
console.log(`Trovati ${files.length} file da sincronizzare\n`);
if (files.length === 0) { await prisma.$disconnect(); process.exit(0); }
if (dryRun) {
  files.slice(0, 10).forEach((f,i) => console.log(`  ${i+1}. ${f.folder}/${f.filename}`));
  if (files.length > 10) console.log(`  ... e altri ${files.length-10}`);
  await prisma.$disconnect(); process.exit(0);
}

const SIZE_CONFIGS = {
  cover: { maxWidth: 1200, maxHeight: 1500, quality: 92 },
  hero: { maxWidth: 2560, maxHeight: 1440, quality: 95 },
  general: { maxWidth: 1400, maxHeight: 1400, quality: 90 },
};

async function readLocalFile(url) {
  const normalized = url.startsWith("/api/uploads/") ? url.replace("/api/uploads/", "/uploads/") : url;
  if (!normalized.startsWith("/uploads/")) return null;
  try {
    return await readFile(path.join(process.cwd(), "public", normalized));
  } catch { return null; }
}

function buildPublicUrl(key) {
  return cdnBase ? `${cdnBase}/${key}` : `/api/vay/${key}`;
}

async function processImage(buffer, purpose = "general") {
  const c = SIZE_CONFIGS[purpose] || SIZE_CONFIGS.general;
  const processed = await sharp(buffer)
    .resize(c.maxWidth, c.maxHeight, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: c.quality })
    .toBuffer();
  const medium = await sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  const thumbnail = await sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const meta = await sharp(processed).metadata();
  return { processed, medium, thumbnail, meta };
}

async function uploadOne(buf, key, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: buf, ContentType: contentType,
  }));
  return buildPublicUrl(key);
}

let synced = 0, failed = 0, skipped = 0;

for (const [i, file] of files.entries()) {
  const prefix = `[${i+1}/${files.length}]`;
  const buffer = await readLocalFile(file.url);
  if (!buffer) { console.log(`${prefix} SKIP ${file.filename} (file locale non trovato)`); skipped++; continue; }

  try {
    const isImage = file.mimeType.startsWith("image/");
    // Key su VAY: usa il folder DB corrente (che è la NUOVA struttura professionisti/...)
    const key = `${file.folder}/${file.filename}`;

    if (isImage) {
      const { processed, medium, thumbnail, meta } = await processImage(buffer, file.folder === "hero" ? "hero" : "general");
      const wasabiUrl = await uploadOne(processed, key, "image/webp");
      const mdFilename = file.filename.replace(/^(\d+-)/, "$1md-");
      const mdKey = `${file.folder}/${mdFilename}`;
      const mediumUrl = await uploadOne(medium, mdKey, "image/webp");
      const thFilename = file.filename.replace(/^(\d+-)/, "$1thumb-");
      const thKey = `${file.folder}/thumbs/${thFilename}`;
      const thumbnailUrl = await uploadOne(thumbnail, thKey, "image/webp");

      await prisma.mediaFile.update({
        where: { id: file.id },
        data: {
          wasabiUrl, wasabiKey: key,
          isSynced: true, syncedAt: new Date(),
          width: meta.width, height: meta.height, size: processed.length,
          originalSize: file.originalSize || buffer.length,
          mediumUrl, mediumKey: mdKey, mediumSize: medium.length,
          thumbnailUrl, thumbnailKey: thKey, thumbnailSize: thumbnail.length,
        },
      });
    } else {
      const wasabiUrl = await uploadOne(buffer, key, file.mimeType);
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: { wasabiUrl, wasabiKey: key, isSynced: true, syncedAt: new Date() },
      });
    }
    synced++;
    if (synced % 5 === 0 || synced === 1) console.log(`${prefix} OK ${file.folder}/${file.filename}`);
  } catch (e) {
    console.error(`${prefix} FAIL ${file.filename}: ${e.message}`);
    failed++;
  }
}

console.log(`\n═══ RIEPILOGO ═══`);
console.log(`Sincronizzati: ${synced}`);
console.log(`Falliti:       ${failed}`);
console.log(`Saltati:       ${skipped}`);
await prisma.$disconnect();
