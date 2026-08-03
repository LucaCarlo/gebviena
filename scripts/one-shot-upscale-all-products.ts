/**
 * Upscale + upload di tutte le immagini di tutti i prodotti attivi.
 * Campi: imageUrl, heroImage, sideImage, coverImage, galleryImages (JSON array).
 * Target: min 2000px larghezza, lanczos + sharpen + WebP q95, suffix -hd2.
 * Cerca file locale in: uploads/products/{slug}/, uploads/products/, uploads/ root.
 */
import { existsSync } from "fs";
import { basename } from "path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";

const UPLOADS_BASE = "/home/gebruederthonetvienna-usr/htdocs/gebruederthonetvienna.com/public/uploads";
const LOCAL_PRODUCTS = `${UPLOADS_BASE}/products`;
const CDN_HOST = "https://cdn.gebruederthonetvienna.com/";
const TARGET_MIN_WIDTH = 2000;
const OUT_SUFFIX = "hd2";

const counters = { processed: 0, skippedNoLocal: 0, skippedBig: 0, errors: 0 };

async function processOne(remoteUrl: string, s3: S3Client, bucket: string, slug: string): Promise<string> {
  const rawFilename = basename(remoteUrl);
  const originalFilename = rawFilename.replace(/-hd2?(?=\.[a-z]+$)/i, "");
  // Skip PNG (drawings tecnici) e file non-immagine
  if (!/\.(webp|jpe?g|png)$/i.test(originalFilename)) return remoteUrl;
  // Salta i disegni tecnici (di solito PNG con linee — l'upscale non serve)
  if (/technical-drawing/i.test(originalFilename)) return remoteUrl;

  const candidates = [
    `${LOCAL_PRODUCTS}/${slug}/${originalFilename}`,
    `${LOCAL_PRODUCTS}/${originalFilename}`,
    `${UPLOADS_BASE}/${originalFilename}`,
    `${UPLOADS_BASE}/general/${originalFilename}`,
  ];
  let localPath = "";
  for (const c of candidates) {
    if (existsSync(c)) { localPath = c; break; }
  }
  if (!localPath) { counters.skippedNoLocal++; return remoteUrl; }

  try {
    const meta = await sharp(localPath).metadata();
    const w = meta.width || 0;
    if (w === 0) { counters.errors++; return remoteUrl; }
    const scale = w >= TARGET_MIN_WIDTH ? 1 : TARGET_MIN_WIDTH / w;
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
    const key = `products/${newFilename}`;
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

  // Se argv[2] presente, elabora solo quel slug (mode test/single)
  const singleSlug = process.argv[2];
  const where = singleSlug ? { slug: singleSlug } : { isActive: true };
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, slug: true,
      imageUrl: true, heroImage: true, sideImage: true, coverImage: true,
      galleryImages: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  console.log(`[start] prodotti da processare: ${products.length}${singleSlug ? ` (only ${singleSlug})` : ""}`);

  let cnt = 0;
  const t0 = Date.now();
  for (const p of products) {
    cnt++;
    const t1 = Date.now();
    let galleryImages: string[] = [];
    try {
      galleryImages = p.galleryImages ? JSON.parse(p.galleryImages) : [];
    } catch { /* skip */ }
    const newGallery: string[] = [];
    for (const url of galleryImages) {
      if (typeof url !== "string" || !url.startsWith(CDN_HOST)) {
        newGallery.push(url); continue;
      }
      const newUrl = await processOne(url, s3, bucket, p.slug);
      newGallery.push(newUrl);
    }
    const isCdn = (u: string | null | undefined) => !!u && u.startsWith(CDN_HOST);
    const newImage = isCdn(p.imageUrl) ? await processOne(p.imageUrl, s3, bucket, p.slug) : p.imageUrl;
    const newHero = isCdn(p.heroImage) ? await processOne(p.heroImage!, s3, bucket, p.slug) : p.heroImage;
    const newSide = isCdn(p.sideImage) ? await processOne(p.sideImage!, s3, bucket, p.slug) : p.sideImage;
    const newCover = isCdn(p.coverImage) ? await processOne(p.coverImage!, s3, bucket, p.slug) : p.coverImage;

    await prisma.product.update({
      where: { id: p.id },
      data: {
        imageUrl: newImage,
        heroImage: newHero,
        sideImage: newSide,
        coverImage: newCover,
        galleryImages: JSON.stringify(newGallery),
      },
    });
    console.log(`[${cnt}/${products.length}] ${p.slug}: ${newGallery.length} gallery + main/hero/side/cover (${((Date.now()-t1)/1000).toFixed(1)}s)`);
  }
  console.log(`\n[done] tempo tot: ${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.log(`  processed=${counters.processed} skippedNoLocal=${counters.skippedNoLocal} skippedBig=${counters.skippedBig} errors=${counters.errors}`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); }).finally(() => prisma.$disconnect());
