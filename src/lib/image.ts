import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export type ImagePurpose = "cover" | "hero" | "side" | "gallery" | "thumbnail" | "general" | "news" | "variant" | "dimensions";

export type OutputFormat = "webp" | "jpeg" | "preserve";

export interface PresetConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export interface MediaSettings {
  presets: Record<ImagePurpose, PresetConfig>;
  format: OutputFormat;
  keepOriginal: boolean;
  generateVariants: boolean;
  mediumMaxWidth: number;
  mediumQuality: number;
  thumbnailMaxWidth: number;
  thumbnailQuality: number;
}

// Default preset (usato come fallback e come seed iniziale nell'admin).
// Alzati rispetto ai valori storici per catalogo design (retina/4K).
export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  presets: {
    cover:      { maxWidth: 2000, maxHeight: 2500, quality: 95 },
    hero:       { maxWidth: 2560, maxHeight: 1440, quality: 95 },
    side:       { maxWidth: 1600, maxHeight: 2200, quality: 95 },
    gallery:    { maxWidth: 2400, maxHeight: 3000, quality: 95 },
    thumbnail:  { maxWidth: 400,  maxHeight: 400,  quality: 82 },
    general:    { maxWidth: 2000, maxHeight: 2000, quality: 92 },
    news:       { maxWidth: 2400, maxHeight: 1500, quality: 92 },
    variant:    { maxWidth: 1200, maxHeight: 1200, quality: 92 },
    dimensions: { maxWidth: 1200, maxHeight: 600,  quality: 92 },
  },
  format: "webp",
  keepOriginal: false,
  generateVariants: true,
  mediumMaxWidth: 800,
  mediumQuality: 88,
  thumbnailMaxWidth: 400,
  thumbnailQuality: 82,
};

// Cache in-memory delle settings per non colpire il DB a ogni upload.
// Invalidata dal PUT dell'endpoint admin.
let cache: { data: MediaSettings; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export function invalidateMediaSettingsCache() {
  cache = null;
}

export async function getMediaSettings(): Promise<MediaSettings> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.data;

  try {
    const row = await prisma.setting.findUnique({ where: { key: "media_settings" } });
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<MediaSettings>;
      const merged: MediaSettings = {
        ...DEFAULT_MEDIA_SETTINGS,
        ...parsed,
        presets: { ...DEFAULT_MEDIA_SETTINGS.presets, ...(parsed.presets || {}) },
      };
      cache = { data: merged, expires: now + CACHE_TTL_MS };
      return merged;
    }
  } catch {
    // fallback silenzioso ai default
  }
  cache = { data: DEFAULT_MEDIA_SETTINGS, expires: now + CACHE_TTL_MS };
  return DEFAULT_MEDIA_SETTINGS;
}

function applyFormat(pipeline: sharp.Sharp, format: OutputFormat, quality: number, originalMime?: string): sharp.Sharp {
  if (format === "webp") return pipeline.webp({ quality });
  if (format === "jpeg") return pipeline.jpeg({ quality, mozjpeg: true });
  // preserve: rispetta il tipo originale, con fallback a webp per formati "non stampabili"
  if (originalMime === "image/png") return pipeline.png({ quality });
  if (originalMime === "image/jpeg" || originalMime === "image/jpg") return pipeline.jpeg({ quality, mozjpeg: true });
  return pipeline.webp({ quality });
}

export async function processImage(
  inputBuffer: Buffer,
  purpose: string,
  originalMime?: string
): Promise<{
  processed: Buffer;
  medium: Buffer;
  thumbnail: Buffer;
  outputExt: string;
  outputMime: string;
  keepOriginal: boolean;
  metadata: { width: number; height: number; size: number; originalSize: number };
}> {
  const settings = await getMediaSettings();
  const config = settings.presets[purpose as ImagePurpose] || settings.presets.general;
  const originalSize = inputBuffer.length;

  // Large: alla dimensione del preset, formato scelto
  const largePipeline = sharp(inputBuffer)
    .resize(config.maxWidth, config.maxHeight, { fit: "inside", withoutEnlargement: true });
  const processed = await applyFormat(largePipeline, settings.format, config.quality, originalMime).toBuffer();

  // Medium e thumbnail: opzionali (settings.generateVariants).
  // Se disattivati, restituiamo il processed come fallback (upload route puo' evitare
  // di caricarli — ma per compatibilita' li restituiamo lo stesso).
  let medium = processed;
  let thumbnail = processed;
  if (settings.generateVariants) {
    const mediumPipeline = sharp(inputBuffer)
      .resize(settings.mediumMaxWidth, settings.mediumMaxWidth, { fit: "inside", withoutEnlargement: true });
    medium = await applyFormat(mediumPipeline, settings.format, settings.mediumQuality, originalMime).toBuffer();

    const thumbnailPipeline = sharp(inputBuffer)
      .resize(settings.thumbnailMaxWidth, settings.thumbnailMaxWidth, { fit: "inside", withoutEnlargement: true });
    thumbnail = await applyFormat(thumbnailPipeline, settings.format, settings.thumbnailQuality, originalMime).toBuffer();
  }

  const meta = await sharp(processed).metadata();

  // Deriva estensione + mime del formato scelto
  const { outputExt, outputMime } = deriveOutput(settings.format, originalMime);

  return {
    processed,
    medium,
    thumbnail,
    outputExt,
    outputMime,
    keepOriginal: settings.keepOriginal,
    metadata: {
      width: meta.width || 0,
      height: meta.height || 0,
      size: processed.length,
      originalSize,
    },
  };
}

function deriveOutput(format: OutputFormat, originalMime?: string): { outputExt: string; outputMime: string } {
  if (format === "jpeg") return { outputExt: "jpg", outputMime: "image/jpeg" };
  if (format === "webp") return { outputExt: "webp", outputMime: "image/webp" };
  // preserve
  if (originalMime === "image/png") return { outputExt: "png", outputMime: "image/png" };
  if (originalMime === "image/jpeg" || originalMime === "image/jpg") return { outputExt: "jpg", outputMime: "image/jpeg" };
  return { outputExt: "webp", outputMime: "image/webp" };
}

export function getOutputFilename(originalName: string, ext: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return `${baseName}.${ext}`;
}

// Backwards-compat: alcuni callers usano ancora getWebpFilename
export function getWebpFilename(originalName: string): string {
  return getOutputFilename(originalName, "webp");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
