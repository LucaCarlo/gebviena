/**
 * Costruisce l'URL per il download di un file.
 *
 * Se l'URL è cross-origin (es. CDN Bunny), passa dal proxy /api/download
 * che aggiunge il header `Content-Disposition: attachment` — così il browser
 * scarica il file invece di aprirlo (l'attributo HTML `download` non funziona
 * cross-origin senza quel header).
 *
 * Se l'URL è same-origin (/uploads/... o path relativi), la usa direttamente.
 *
 * @param url        URL del file da scaricare (assoluta o relativa)
 * @param filename   Nome file da suggerire al browser (opzionale)
 */
export function buildDownloadUrl(url: string | null | undefined, filename?: string | null): string {
  if (!url) return "";
  const u = String(url).trim();
  if (!u) return "";
  // URL assoluta cross-origin → proxy
  if (/^https?:\/\//i.test(u)) {
    const f = filename ? encodeURIComponent(String(filename)) : "";
    return `/api/download?u=${encodeURIComponent(u)}${f ? `&f=${f}` : ""}`;
  }
  // Same-origin: url diretta
  return u;
}
