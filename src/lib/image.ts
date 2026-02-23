import sharp from "sharp";

export type ImagePurpose = "cover" | "hero" | "side" | "gallery" | "thumbnail" | "general";

interface SizeConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const SIZE_CONFIGS: Record<ImagePurpose, SizeConfig> = {
  cover:     { maxWidth: 1200, maxHeight: 1500, quality: 92 },
  hero:      { maxWidth: 1920, maxHeight: 1080, quality: 92 },
  side:      { maxWidth: 1000, maxHeight: 1400, quality: 90 },
  gallery:   { maxWidth: 1400, maxHeight: 1800, quality: 90 },
  thumbnail: { maxWidth: 400,  maxHeight: 400,  quality: 80 },
  general:   { maxWidth: 1400, maxHeight: 1400, quality: 90 },
};

export async function processImage(
  inputBuffer: Buffer,
  purpose: ImagePurpose
): Promise<{
  processed: Buffer;
  medium: Buffer;
  thumbnail: Buffer;
  metadata: { width: number; height: number; size: number; originalSize: number };
}> {
  const config = SIZE_CONFIGS[purpose];
  const originalSize = inputBuffer.length;

  // Large: full quality at target dimensions
  const processed = await sharp(inputBuffer)
    .resize(config.maxWidth, config.maxHeight, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: config.quality })
    .toBuffer();

  // Medium: 800px max, good quality for listings/cards
  const medium = await sharp(inputBuffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  // Thumbnail: 400px, lighter quality for previews
  const thumbnail = await sharp(inputBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const meta = await sharp(processed).metadata();

  return {
    processed,
    medium,
    thumbnail,
    metadata: {
      width: meta.width || 0,
      height: meta.height || 0,
      size: processed.length,
      originalSize,
    },
  };
}

export function getWebpFilename(originalName: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return `${baseName}.webp`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
