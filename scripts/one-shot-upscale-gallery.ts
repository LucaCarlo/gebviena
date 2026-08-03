/**
 * Upscale + upload della galleria del progetto (galleryUrls + heroImage + sideImage).
 * Cerca il file locale ORIGINALE (senza -hd/-hd2) e lo upscale a 2000px larghezza min.
 */
import { existsSync } from "fs";
import { basename } from "path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";

const LOCAL_BASE = "/home/gebruederthonetvienna-usr/htdocs/gebruederthonetvienna.com/public/uploads/projects";
const CDN_HOST = "https://cdn.gebruederthonetvienna.com/";
const TARGET_MIN_WIDTH = 2000;
const OUT_SUFFIX = "hd2";

async function processOne(remoteUrl: string, s3: S3Client, bucket: string, slug: string): Promise<string> {
  // Strip suffix -hd o -hd2 dal filename per trovare l'originale
  const rawFilename = basename(remoteUrl);
  const originalFilename = rawFilename.replace(/-hd2?(?=\.[a-z]+$)/i, "");
  const localPath = `${LOCAL_BASE}/${slug}/${originalFilename}`;
  if (!existsSync(localPath)) {
    console.log(`[skip] no local file: ${originalFilename}`);
    return remoteUrl;
  }
  const meta = await sharp(localPath).metadata();
  const w = meta.width || 0;
  const scale = w >= TARGET_MIN_WIDTH ? 1 : TARGET_MIN_WIDTH / w;
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
  console.log(`[ok] ${originalFilename} ${w}x${meta.height} -> ${targetW}x${targetH} (${Math.round(buf.length/1024)}KB)`);
  return `${CDN_HOST}${key}`;
}

async function main() {
  const slug = process.argv[2] || "the-espresso-lab";
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) { console.error(`no project ${slug}`); return; }

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

  let galleryUrls: string[] = [];
  try {
    galleryUrls = project.galleryUrls ? JSON.parse(project.galleryUrls) : [];
  } catch { /* skip */ }
  const newGallery: string[] = [];
  for (const url of galleryUrls) {
    const newUrl = await processOne(url, s3, bucket, slug);
    newGallery.push(newUrl);
  }

  let newHero: string | null = project.heroImage;
  if (project.heroImage && project.heroImage.startsWith(CDN_HOST)) {
    newHero = await processOne(project.heroImage, s3, bucket, slug);
  }
  let newSide: string | null = project.sideImage;
  if (project.sideImage && project.sideImage.startsWith(CDN_HOST)) {
    newSide = await processOne(project.sideImage, s3, bucket, slug);
  }

  await prisma.project.update({
    where: { slug },
    data: {
      galleryUrls: JSON.stringify(newGallery),
      heroImage: newHero,
      sideImage: newSide,
    },
  });
  console.log(`[done] project ${slug}: ${newGallery.length} gallery updated`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); }).finally(() => prisma.$disconnect());
