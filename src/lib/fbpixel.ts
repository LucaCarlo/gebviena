/**
 * Wrapper sicuro per Meta Pixel (`window.fbq`).
 * Il pixel base è iniettato globalmente in src/app/layout.tsx con strategy
 * "beforeInteractive" (legge l'ID da Admin → Impostazioni Store →
 * "Facebook / Meta Pixel ID", fallback hardcoded).
 *
 * Usage:
 *   fbTrack("AddToCart", { value: 250, currency: "EUR" });
 */

type FbqFn = ((cmd: string, event: string, params?: Record<string, unknown>) => void) & {
  queue?: unknown[][];
  callMethod?: unknown;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/** Manda un evento standard Meta. Se il pixel non è ancora caricato, l'evento
 *  viene messo in coda manualmente (stub Meta lo flusha quando fbevents.js arriva). */
export function fbTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", event, params);
      return;
    }
    // Fallback: pixel non ancora pronto → coda manualmente, lo stub Meta la
    // svuoterà quando fbevents.js sarà caricato.
    const w = window as unknown as { fbq?: FbqFn };
    if (!w.fbq) {
      const stub = function (...args: unknown[]) {
        (stub as FbqFn).queue!.push(args as unknown[]);
      } as unknown as FbqFn;
      stub.queue = [];
      w.fbq = stub;
    }
    w.fbq!.queue!.push(["track", event, params as unknown]);
  } catch {
    /* silent */
  }
}
