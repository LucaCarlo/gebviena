import { prisma } from "@/lib/prisma";

/**
 * Bunny Stream (VAY Stream Video Library) integration.
 * API docs: https://docs.bunny.net/reference/video_createvideo
 *
 * Flow:
 * 1. createStreamVideo(title) → crea record vuoto, restituisce guid
 * 2. uploadStreamVideoBinary(guid, buffer) → upload effettivo del file
 * 3. Bunny encoda in background (queued → processing → finished)
 * 4. Videos accessibili via iframe embed o MP4 diretto per qualità
 */

interface StreamConfig {
  libraryId: string;
  apiKey: string;
  hostname: string;
  enabled: boolean;
}

let cachedConfig: StreamConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function getStreamConfig(): Promise<StreamConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) return cachedConfig;

  const settings = await prisma.setting.findMany({ where: { group: "storage" } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  cachedConfig = {
    libraryId: map.bunny_stream_library_id || "",
    apiKey: map.bunny_stream_api_key || "",
    hostname: map.bunny_stream_hostname || "",
    enabled: map.bunny_stream_enabled === "true",
  };
  cacheTime = now;
  return cachedConfig;
}

export function invalidateStreamCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}

export async function isStreamConfigured(): Promise<boolean> {
  const c = await getStreamConfig();
  return c.enabled && !!(c.libraryId && c.apiKey && c.hostname);
}

const BUNNY_STREAM_API = "https://video.bunnycdn.com";

async function streamApi<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: string | Buffer | null,
  contentType = "application/json",
): Promise<T> {
  const c = await getStreamConfig();
  const url = `${BUNNY_STREAM_API}/library/${c.libraryId}${path}`;
  const headers: Record<string, string> = {
    AccessKey: c.apiKey,
    accept: "application/json",
  };
  if (body != null) headers["content-type"] = contentType;

  const res = await fetch(url, { method, headers, body: body as BodyInit });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Bunny Stream ${method} ${path} → ${res.status} ${t.substring(0, 200)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return {} as T;
}

interface CreatedVideo { guid: string; title: string }

/** Crea un video vuoto e restituisce il suo guid. */
export async function createStreamVideo(title: string): Promise<CreatedVideo> {
  const r = await streamApi<{ guid: string; title: string }>("POST", "/videos", JSON.stringify({ title }));
  return { guid: r.guid, title: r.title };
}

/** Upload del binario per un video già creato. */
export async function uploadStreamVideoBinary(
  guid: string,
  buffer: Buffer,
  contentType = "application/octet-stream",
): Promise<void> {
  await streamApi("PUT", `/videos/${guid}`, buffer, contentType);
}

/**
 * Stati Bunny (dal loro API):
 *  0 = Created (in queue, upload possibile)
 *  1 = Uploaded (in coda per encoding)
 *  2 = Processing (encoding in corso)
 *  3 = Transcoding (parte finale)
 *  4 = Finished (pronto per playback)
 *  5 = Error
 *  6 = UploadFailed
 */
export interface StreamVideoInfo {
  guid: string;
  title: string;
  status: number;
  length: number; // durata in secondi
  width: number;
  height: number;
  availableResolutions: string; // "240p,480p,720p"
  storageSize: number;
  thumbnailFileName?: string;
  category?: string;
}

export async function getStreamVideo(guid: string): Promise<StreamVideoInfo> {
  return await streamApi<StreamVideoInfo>("GET", `/videos/${guid}`);
}

export async function deleteStreamVideo(guid: string): Promise<void> {
  await streamApi("DELETE", `/videos/${guid}`);
}

/** Attende il completamento encoding (max ~2 min). */
export async function waitForStreamReady(guid: string, timeoutMs = 120_000): Promise<StreamVideoInfo> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await getStreamVideo(guid);
    if (info.status === 4) return info; // Finished
    if (info.status === 5 || info.status === 6) throw new Error(`Stream encoding failed: status ${info.status}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  // Timeout: torniamo comunque le info, ma non è "finished"
  return await getStreamVideo(guid);
}

// ─── URL builders ───────────────────────────────────────────────────────────

export function buildStreamIframeUrl(guid: string): string {
  const c = { libraryId: cachedConfig?.libraryId || "" };
  return `https://iframe.mediadelivery.net/embed/${c.libraryId}/${guid}?autoplay=false&preload=true`;
}

export function buildStreamMp4Url(guid: string, quality: "240p" | "360p" | "480p" | "720p" | "1080p" = "720p"): string {
  const c = { hostname: cachedConfig?.hostname || "" };
  return `https://${c.hostname}/${guid}/play_${quality}.mp4`;
}

export function buildStreamHlsUrl(guid: string): string {
  const c = { hostname: cachedConfig?.hostname || "" };
  return `https://${c.hostname}/${guid}/playlist.m3u8`;
}

export function buildStreamThumbnailUrl(guid: string): string {
  const c = { hostname: cachedConfig?.hostname || "" };
  return `https://${c.hostname}/${guid}/thumbnail.jpg`;
}
