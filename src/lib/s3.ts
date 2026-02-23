import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.WASABI_REGION || "eu-central-1",
  endpoint: process.env.WASABI_ENDPOINT || "https://s3.eu-central-1.wasabisys.com",
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY || "",
    secretAccessKey: process.env.WASABI_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.WASABI_BUCKET || "";

export function isS3Configured(): boolean {
  return !!(process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY && process.env.WASABI_BUCKET);
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  }));

  const endpoint = process.env.WASABI_ENDPOINT || "https://s3.eu-central-1.wasabisys.com";
  return `${endpoint}/${BUCKET}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

export async function checkS3Connection(): Promise<boolean> {
  if (!isS3Configured()) return false;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch {
    return false;
  }
}

export { s3Client, BUCKET };
