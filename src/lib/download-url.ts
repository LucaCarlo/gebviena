/**
 * Costruisce l'URL per il download di un file.
 *
 * Se l'URL e' cross-origin (es. CDN Bunny), passa dal proxy /api/download
 * che aggiunge il header `Content-Disposition: attachment` e — se richiesto —
 * converte on-the-fly le immagini nel formato scelto (jpg/png/webp/original).
 *
 * Se l'URL e' same-origin (/uploads/... o path relativi) senza conversione,
 * la usa direttamente. Se e' richiesto un format, passa comunque dal proxy.
 *
 * @param url        URL del file da scaricare (assoluta o relativa)
 * @param filename   Nome file da suggerire al browser (opzionale)
 * @param format     "jpg" | "png" | "webp" | "original" — SOLO per immagini
 */
export type DownloadFormat = "jpg" | "png" | "webp" | "original";

export function buildDownloadUrl(
  url: string | null | undefined,
  filename?: string | null,
  format?: DownloadFormat | null,
): string {
  if (!url) return "";
  const u = String(url).trim();
  if (!u) return "";

  const isAbsolute = /^https?:\/\//i.test(u);
  const needsProxy = isAbsolute || !!format; // se serve conversione, passa sempre dal proxy

  if (!needsProxy) return u;

  const params = new URLSearchParams();
  params.set("u", u);
  if (filename) params.set("f", String(filename));
  if (format) params.set("format", format);
  return `/api/download?${params.toString()}`;
}
