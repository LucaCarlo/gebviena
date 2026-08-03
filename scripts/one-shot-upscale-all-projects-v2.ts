/**
 * Upscale + upload di tutte le gallerie di tutti i progetti attivi.
 * V2: cerca file locale in {slug}/ + fallback /public/uploads/ root.
 * Target: min 2000px larghezza, lanczos + sharpen + WebP q95, suffix -hd2.
 */
import { existsSync } from "fs";
import { basename } from "path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";

const UPLOADS_BASE = "/home/gebruederthonetvienna-usr/htdocs/gebruederthonetvienna.com/public/uploads";
const LOCAL_PROJECTS = `${UPLOADS_BASE}/projects`;
const CDN_HOST = "https://cdn.gebruederthonetvienna.com/";
const TARGET_MIN_WIDTH = 2000;
const OUT_SUFFIX = "hd2";

let counters = { processed: 0, skippedNoLocal: 0, skippedBig: 0, errors: 0 };

async function processOne(remoteUrl: string, s3: S3Client, bucket: string, slug: string): Promise<string> {
  const rawFilename = basename(remoteUrl);
  const originalFilename = rawFilename.replace(/-hd2?(?=\.[a-z]+$)/i, "");

  // Cerca in ordine: /projects/{slug}/, /uploads/ root, /uploads/hero/ (hero folder)
  const candidates = [
    `${LOCAL_PROJECTS}/${slug}/${originalFilename}`,
    `${UPLOADS_BASE}/${originalFilename}`,
    `${UPLOADS_BASE}/hero/${originalFilename}`,
    `${UPLOADS_BASE}/covers/${originalFilename}`,
    `${UPLOADS_BASE}/general/${originalFilename}`,
  ];
  let localPath = "";
  for (const c of candidates) {
    if (existsSync(c)) { localPath = c; break; }
  }
  if (!localPath) {
    counters.skippedNoLocal++;
    return remoteUrl;
  }

  try {
    const meta = await sharp(localPath).metadata();
    const w = meta.width || 0;
    if (w === 0) { counters.errors++; return remoteUrl; }
    const scale = w >= TARGET_MIN_WIDTH ? 1 : TARGET_MIN_WIDTH / w;
    // Se scale=1 e il file è già -hd2, skip (già fatto)
    if (scale === 1 && rawFilename.includes(`-${OUT_SUFFIX}`)) {
      counters.skippedBig++;
      return remoteUrl;
    }
    const targetW = Math.round(w * scale);
    const targetH = Math.round((meta.height || 0) * scale);
    const buf = await sharp(localPath)
      .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 0.8, m1: 1, m2: 2 })
      .webp({ quality: 95, effort: 6 })
      .toBuffer();
    const nameBase = originalFilename.replace(/\.(webp|jpe?g|png)$/i, "");
    const newFilename = `${nameBase}-${OUT_SUFFIX}.webp`;
    const key = `projects/${newFilename}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: buf, ContentType: "image/webp",
    }));
    counters.processed++;
    return `${CDN_HOST}${key}`;
  } catch (e) {
    counters.errors++;
    console.error(`  [err] ${originalFilename}: ${(e as Error).message}`);
    return remoteUrl;
  }
}

async function main() {
  const settings = await prisma.setting.findMany({ where: { group: "storage" } });
  const m: Record<string, string> = {};
  for (const s of settings) m[s.key] = s.value;
  const s3 = new S3Client({
    endpoint: m.bunny_endpoint,
    region: m.bunny_region || "de",
    credentials: { accessKeyId: m.bunny_access_key, secretAccessKey: m.bunny_secret_key },
    forcePathStyle: true,
  });
  const bucket = m.bunny_storage_zone;

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, galleryUrls: true, heroImage: true, sideImage: true, coverImage: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log(`[start v2] progetti attivi: ${projects.length}`);

  let cnt = 0;
  const t0 = Date.now();
  for (const p of projects) {
    cnt++;
    const t1 = Date.now();
    let galleryUrls: string[] = [];
    try {
      galleryUrls = p.galleryUrls ? JSON.parse(p.galleryUrls) : [];
    } catch { /* skip */ }
    const newGallery: string[] = [];
    for (const url of galleryUrls) {
      const newUrl = await processOne(url, s3, bucket, p.slug);
      newGallery.push(newUrl);
    }
    let newHero: string | null = p.heroImage;
    if (p.heroImage && p.heroImage.startsWith(CDN_HOST)) {
      newHero = await processOne(p.heroImage, s3, bucket, p.slug);
    }
    let newSide: string | null = p.sideImage;
    if (p.sideImage && p.sideImage.startsWith(CDN_HOST)) {
      newSide = await processOne(p.sideImage, s3, bucket, p.slug);
    }
    let newCover: string | null = p.coverImage;
    if (p.coverImage && p.coverImage.startsWith(CDN_HOST)) {
      newCover = await processOne(p.coverImage, s3, bucket, p.slug);
    }
    await prisma.project.update({
      where: { id: p.id },
      data: {
        galleryUrls: JSON.stringify(newGallery),
        heroImage: newHero,
        sideImage: newSide,
        coverImage: newCover,
      },
    });
    console.log(`[${cnt}/${projects.length}] ${p.slug}: ${newGallery.length} gallery (${((Date.now()-t1)/1000).toFixed(1)}s)`);
  }
  console.log(`\n[done] tempo tot: ${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.log(`  processed=${counters.processed} skippedNoLocal=${counters.skippedNoLocal} skippedBig=${counters.skippedBig} errors=${counters.errors}`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); }).finally(() => prisma.$disconnect());
