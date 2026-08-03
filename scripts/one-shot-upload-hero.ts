/**
 * Upload one-shot dell'hero grande (1868x2335) al posto della piccola (640x800).
 */
import { readFileSync } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";

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

  const localPath = "/home/gebruederthonetvienna-usr/htdocs/gebruederthonetvienna.com/public/uploads/projects/the-espresso-lab/espresso-lab-cover-4x5.webp";
  const key = "projects/espresso-lab-cover-4x5-hd.webp";
  const body = readFileSync(localPath);
  console.log(`[upload] local=${localPath} bytes=${body.length}`);
  await s3.send(new PutObjectCommand({
    Bucket: m.bunny_storage_zone, Key: key, Body: body, ContentType: "image/webp",
  }));
  console.log(`[upload] OK https://cdn.gebruederthonetvienna.com/${key}`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); }).finally(() => prisma.$disconnect());
