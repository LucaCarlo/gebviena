/**
 * Upscale 2x + sharpen dell'hero espresso lab, uploada su CDN.
 * 1868x2335 → 3736x4670 con lanczos + unsharp mask per percezione nitidezza.
 */
import { readFileSync, writeFileSync } from "fs";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";

async function main() {
  const inputPath = "/home/gebruederthonetvienna-usr/htdocs/gebruederthonetvienna.com/public/uploads/projects/the-espresso-lab/espresso-lab-cover-4x5.webp";
  const outPath = "/tmp/espresso-lab-cover-hd2.webp";

  const meta = await sharp(inputPath).metadata();
  console.log(`[upscale] input=${meta.width}x${meta.height} ${meta.format}`);

  // Upscale 2x con lanczos3 (algoritmo top per foto), poi unsharp per compensare la morbidezza,
  // encode webp quality 95.
  const buf = await sharp(inputPath)
    .resize(Math.round((meta.width || 1868) * 1.6), Math.round((meta.height || 2335) * 1.6), {
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.8, m1: 1, m2: 2 })
    .webp({ quality: 95, effort: 6 })
    .toBuffer();

  writeFileSync(outPath, buf);
  const newMeta = await sharp(buf).metadata();
  console.log(`[upscale] output=${newMeta.width}x${newMeta.height} bytes=${buf.length}`);

  // Upload su Bunny CDN con nome nuovo per bypassare cache
  const settings = await prisma.setting.findMany({ where: { group: "storage" } });
  const m: Record<string, string> = {};
  for (const s of settings) m[s.key] = s.value;

  const s3 = new S3Client({
    endpoint: m.bunny_endpoint,
    region: m.bunny_region || "de",
    credentials: { accessKeyId: m.bunny_access_key, secretAccessKey: m.bunny_secret_key },
    forcePathStyle: true,
  });

  const key = "projects/espresso-lab-cover-4x5-hd2.webp";
  await s3.send(new PutObjectCommand({
    Bucket: m.bunny_storage_zone, Key: key, Body: buf, ContentType: "image/webp",
  }));
  console.log(`[upscale] uploaded https://cdn.gebruederthonetvienna.com/${key}`);

  // Aggiorna DB
  await prisma.project.update({
    where: { slug: "the-espresso-lab" },
    data: { coverImage: `https://cdn.gebruederthonetvienna.com/${key}` },
  });
  console.log(`[upscale] DB updated`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); }).finally(() => prisma.$disconnect());
