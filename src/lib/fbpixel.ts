/**
 * Wrapper sicuro per Meta Pixel (`window.fbq`).
 * Il pixel base è iniettato globalmente in src/app/layout.tsx con strategy
 * "beforeInteractive" (legge l'ID da Admin → Impostazioni Store →
 * "Facebook / Meta Pixel ID", fallback hardcoded).
 *
 * Usage:
 *   fbTrack("AddToCart", { value: 250, currency: "EUR" });
 */

type FbqFn = ((cmd: string, event: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void) & {
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
 *  viene messo in coda manualmente (stub Meta lo flusha quando fbevents.js arriva).
 *
 *  Se passi `eventID`, Meta dedupa contro l'eventuale evento gemello inviato via
 *  CAPI server-side con lo stesso event_id. Usalo per Purchase (eventID=orderNumber),
 *  AddPaymentInfo (eventID=orderNumber + ":api"), Lead (eventID=submissionId). */
export function fbTrack(event: string, params?: Record<string, unknown>, eventID?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.fbq === "function") {
      if (eventID) {
        window.fbq("track", event, params, { eventID });
      } else {
        window.fbq("track", event, params);
      }
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
    if (eventID) {
      w.fbq!.queue!.push(["track", event, params as unknown, { eventID }]);
    } else {
      w.fbq!.queue!.push(["track", event, params as unknown]);
    }
  } catch {
    /* silent */
  }
}
