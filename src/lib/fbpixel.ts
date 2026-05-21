/**
 * Wrapper sicuro per Meta Pixel (`window.fbq`).
 * Il pixel base è iniettato globalmente in src/app/layout.tsx (legge l'ID da
 * Admin → Impostazioni Store → "Facebook / Meta Pixel ID", fallback hardcoded).
 *
 * Usage:
 *   fbTrack("AddToCart", { value: 250, currency: "EUR" });
 */

type FbqFn = (cmd: string, event: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
  }
}

/** Manda un evento standard Meta. Silenzioso se il pixel non è caricato. */
export function fbTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  try {
    fbq("track", event, params);
  } catch {
    /* silent */
  }
}
