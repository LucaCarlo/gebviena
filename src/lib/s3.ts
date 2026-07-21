import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

/**
 * Storage backend abstraction. Legge dal DB (gruppo "storage") sia le
 * credenziali VAY CDN (Bunny) che quelle Wasabi. Quando `bunny_enabled=true`
 * si usa VAY CDN, altrimenti Wasabi.
 *
 * Bunny espone anche un endpoint S3-compatibile, quindi possiamo riusare
 * @aws-sdk/client-s3 sia per Bunny che per Wasabi cambiando solo endpoint,
 * region e credenziali.
 */

interface StorageConfig {
  provider: "vay" | "wasabi";
  accessKey: string;
  secretKey: string;
  bucket: string;   // = storage zone name for Bunny
  region: string;
  endpoint: string;
  cdnUrl: string;   // URL pubblica Pull Zone (solo per VAY)
}

let cachedConfig: StorageConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

async function getStorageConfig(): Promise<StorageConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) return cachedConfig;

  const settings = await prisma.setting.findMany({ where: { group: "storage" } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const bunnyEnabled = map.bunny_enabled === "true";
  if (bunnyEnabled) {
    cachedConfig = {
      provider: "vay",
      accessKey: map.bunny_access_key || map.bunny_storage_zone || "",
      secretKey: map.bunny_secret_key || "",
      bucket: map.bunny_storage_zone || "",
      region: map.bunny_region || "de",
      endpoint: map.bunny_endpoint || `https://${map.bunny_region || "de"}-s3.storage.bunnycdn.com`,
      cdnUrl: (map.bunny_cdn_url || "").replace(/\/$/, ""),
    };
  } else {
    cachedConfig = {
      provider: "wasabi",
      accessKey: map.wasabi_access_key || "",
      secretKey: map.wasabi_secret_key || "",
      bucket: map.wasabi_bucket || "",
      region: map.wasabi_region || "eu-central-1",
      endpoint: map.wasabi_endpoint || "https://s3.eu-central-1.wasabisys.com",
      cdnUrl: "",
    };
  }
  cacheTime = now;
  return cachedConfig;
}

function createS3Client(config: StorageConfig): S3Client {
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

export function invalidateS3Cache(): void {
  cachedConfig = null;
  cacheTime = 0;
}

export async function getActiveProvider(): Promise<"vay" | "wasabi"> {
  return (await getStorageConfig()).provider;
}

export async function isS3Configured(): Promise<boolean> {
  const config = await getStorageConfig();
  return !!(config.accessKey && config.secretKey && config.bucket);
}

/**
 * Restituisce l'URL da salvare in DB per un file appena caricato.
 * - Provider "vay":  usa CDN Pull Zone se configurata, altrimenti fallback
 *   al proxy autenticato /api/vay/<key> (che serve tramite lo Storage API).
 * - Provider "wasabi": URL diretta pubblica al bucket S3.
 */
export function buildPublicUrl(key: string, config: StorageConfig): string {
  if (config.provider === "vay") {
    if (config.cdnUrl) return `${config.cdnUrl}/${key}`;
    return `/api/vay/${key}`;
  }
  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const config = await getStorageConfig();
  const client = createS3Client(config);

  const cmd = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Bunny ignora ACL, Wasabi lo usa per esporre l'oggetto pubblicamente.
    ACL: config.provider === "wasabi" ? "public-read" : undefined,
  });
  await client.send(cmd);

  return buildPublicUrl(key, config);
}

export async function deleteFromS3(key: string): Promise<void> {
  const config = await getStorageConfig();
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
    const config = await getStorageConfig();
    const client = createS3Client(config);
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Legge un oggetto dallo storage e ritorna il body come Buffer + il
 * content-type. Usato dal proxy /api/vay/[...path] per servire i file
 * autenticati senza esporli pubblicamente.
 */
export async function fetchFromS3(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  const config = await getStorageConfig();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = createS3Client(config);

  try {
    const out = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    if (!out.Body) return null;
    // out.Body è un ReadableStream in Node.js runtime
    const stream = out.Body as unknown as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return {
      body: Buffer.concat(chunks),
      contentType: out.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}
