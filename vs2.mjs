// vay-sync-v2: sincronizza dal DISCO LOCALE alla nuova storage zone.
// Usa mapping id→oldUrl estratto dal backup pre-sync per trovare il file locale corretto.
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

// Config VAY dal DB (ora punta alla nuova zone gtv-com)
const settings = await prisma.setting.findMany({ where: { group: "storage" } });
const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
if (cfg.bunny_enabled !== "true") { console.error("VAY non attivo"); process.exit(1); }

const s3 = new S3Client({
  region: cfg.bunny_region,
  endpoint: cfg.bunny_endpoint,
  credentials: { accessKeyId: cfg.bunny_access_key, secretAccessKey: cfg.bunny_secret_key },
  forcePathStyle: true,
});
const bucket = cfg.bunny_storage_zone;
const cdnBase = (cfg.bunny_cdn_url || "").replace(/\/$/, "");
console.log(`[cfg] bucket=${bucket} cdn=${cdnBase}\n`);

// Mappa id → url originale (da backup pre-sync)
const raw = readFileSync("/tmp/mediafile-raw.sql", "utf8");
const idToOldUrl = new Map();
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\('([^']+)','([^']+)','[^']*','[^']*',[0-9]+,'([^']+)'/);
  if (m) idToOldUrl.set(m[1], m[3]);
}
console.log(`Mappati ${idToOldUrl.size} MediaFile → oldUrl dal backup pre-sync`);

const files = await prisma.mediaFile.findMany({ where: { isSynced: false } });
console.log(`Da sincronizzare: ${files.length}\n`);

const SIZE_CONFIGS = {
  hero: { maxWidth: 2560, maxHeight: 1440, quality: 95 },
  general: { maxWidth: 1400, maxHeight: 1400, quality: 90 },
};

async function readLocalFile(f) {
  const oldUrl = idToOldUrl.get(f.id);
  const candidates = [];
  if (oldUrl?.startsWith("/uploads/")) candidates.push(oldUrl);
  candidates.push(`/uploads/${f.filename}`);
  if (f.folder && !f.folder.startsWith("professionisti/")) candidates.push(`/uploads/${f.folder}/${f.filename}`);

  for (const u of candidates) {
    try {
      return await readFile(path.join(process.cwd(), "public", u));
    } catch {}
  }
  return null;
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

async function upload(buf, key, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: contentType }));
  return buildPublicUrl(key);
}

let ok = 0, fail = 0, skip = 0;
const t0 = Date.now();

const CONCURRENCY = 6;
async function syncOne(file, idx) {
  const buffer = await readLocalFile(file);
  if (!buffer) { skip++; return; }
  try {
    const isImage = file.mimeType.startsWith("image/");
    const key = `${file.folder}/${file.filename}`;
    if (isImage) {
      const { processed, medium, thumbnail, meta } = await processImage(buffer, file.folder === "hero" ? "hero" : "general");
      const wasabiUrl = await upload(processed, key, "image/webp");
      const mdFilename = file.filename.replace(/^(\d+-)/, "$1md-");
      const mdKey = `${file.folder}/${mdFilename}`;
      const mediumUrl = await upload(medium, mdKey, "image/webp");
      const thFilename = file.filename.replace(/^(\d+-)/, "$1thumb-");
      const thKey = `${file.folder}/thumbs/${thFilename}`;
      const thumbnailUrl = await upload(thumbnail, thKey, "image/webp");
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: {
          wasabiUrl, wasabiKey: key, isSynced: true, syncedAt: new Date(),
          width: meta.width, height: meta.height, size: processed.length,
          originalSize: file.originalSize || buffer.length,
          mediumUrl, mediumKey: mdKey, mediumSize: medium.length,
          thumbnailUrl, thumbnailKey: thKey, thumbnailSize: thumbnail.length,
        },
      });
    } else {
      const wasabiUrl = await upload(buffer, key, file.mimeType);
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: { wasabiUrl, wasabiKey: key, isSynced: true, syncedAt: new Date() },
      });
    }
    ok++;
  } catch (e) {
    fail++;
    if (fail < 10) console.error(`FAIL ${file.filename.substring(0,50)}: ${e.message.substring(0,60)}`);
  }
}

for (let i = 0; i < files.length; i += CONCURRENCY) {
  const batch = files.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map((f) => syncOne(f, i)));
  const done = ok + fail + skip;
  if (done % 60 === 0 || done === files.length) {
    const pct = ((done / files.length) * 100).toFixed(1);
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    const rate = (done / ((Date.now() - t0) / 1000)).toFixed(1);
    const eta = ((files.length - done) / (done / ((Date.now() - t0) / 1000)) / 60).toFixed(1);
    console.log(`[${done}/${files.length} ${pct}%] ok=${ok} skip=${skip} fail=${fail} rate=${rate}/s eta=${eta}min elapsed=${el}s`);
  }
  if (global.gc && (done % 300 === 0)) global.gc();
}

console.log(`\n═══ FINE ═══\nOK: ${ok}\nSkip: ${skip}\nFail: ${fail}\nTempo: ${((Date.now()-t0)/1000).toFixed(0)}s`);
await prisma.$disconnect();
