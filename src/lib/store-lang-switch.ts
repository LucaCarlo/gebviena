"use client";

import { translateSegmentsBackward, translateSegmentsForward, DEFAULT_LANG } from "@/lib/path-segments";

// Lo store supporta solo IT (default, nessun prefisso) e FR (prefisso /fr).
const STORE_PREFIXES = ["fr"];

/**
 * Cambia la lingua dello store ricostruendo l'URL col prefisso giusto.
 *
 * Il middleware risolve la lingua dal PREFISSO URL (`/fr/...`), non dal
 * cookie: cambiare solo il cookie non basta (con `/fr` nell'URL la lingua
 * resta FR e il cookie viene pure risovrascritto). Qui:
 *  - togliamo l'eventuale prefisso lingua corrente
 *  - ritraduciamo i segmenti noti
 *  - aggiungiamo il nuovo prefisso (o nessuno per IT)
 *  - settiamo il cookie e navighiamo (full reload, la lingua impatta SSR)
 */
export function switchStoreLang(target: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  let segs = path.split("/").filter(Boolean);
  if (segs[0] && STORE_PREFIXES.includes(segs[0])) {
    const cur = segs[0];
    segs = translateSegmentsBackward(segs.slice(1), cur);
  }
  const fwd = translateSegmentsForward(segs, target);
  const basePath = fwd.length ? "/" + fwd.join("/") : "/";
  const qs = window.location.search || "";
  const dest =
    (target === DEFAULT_LANG ? basePath : `/${target}${basePath === "/" ? "" : basePath}`) + qs;
  document.cookie = `gtv_lang=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.href = dest;
}
