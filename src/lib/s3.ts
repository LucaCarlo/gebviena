import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

// ─── DB-backed S3 config (no .env needed) ───────────────────────────────────

interface S3Config {
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  endpoint: string;
}

let cachedConfig: S3Config | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

async function getS3Config(): Promise<S3Config> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  const settings = await prisma.setting.findMany({
    where: { group: "storage" },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  cachedConfig = {
    accessKey: map.wasabi_access_key || "",
    secretKey: map.wasabi_secret_key || "",
    bucket: map.wasabi_bucket || "",
    region: map.wasabi_region || "eu-central-1",
    endpoint: map.wasabi_endpoint || "https://s3.eu-central-1.wasabisys.com",
  };
  cacheTime = now;

  return cachedConfig;
}

function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

/** Invalidate cached config (call after saving settings) */
export function invalidateS3Cache(): void {
  cachedConfig = null;
  cacheTime = 0;
}

export async function isS3Configured(): Promise<boolean> {
  const config = await getS3Config();
  return !!(config.accessKey && config.secretKey && config.bucket);
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const config = await getS3Config();
  const client = createS3Client(config);

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  }));

  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  const config = await getS3Config();
  const client = createS3Client(config);

  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
}

export async function checkS3Connection(): Promise<boolean> {
  const configured = await isS3Configured();
  if (!configured) return false;
  try {
    const config = await getS3Config();
    const client = createS3Client(config);
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return true;
  } catch {
    return false;
  }
}
