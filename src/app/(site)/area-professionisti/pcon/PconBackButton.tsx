"use client";

/**
 * Il vecchio link `<a target="pcon-iframe" href={pconUrl}>` non funzionava
 * affidabilmente: alcuni browser quando l'iframe ha navigato cross-origin
 * non risolvono il target name verso lo stesso frame, e pCon stesso può
 * persistere lo stato in sessionStorage/cookie e ripristinare il prodotto
 * appena aperto.
 *
 * Qui forziamo la ricarica via JS:
 * 1. Trovo l'iframe per name
 * 2. Imposto src su pconUrl + cache buster (così il browser non riusa lo
 *    storico, e pCon vede una request nuova)
 */
export default function PconBackButton({ url, label }: { url: string; label: string }) {
  const back = () => {
    const frame = document.querySelector('iframe[name="pcon-iframe"]') as HTMLIFrameElement | null;
    if (!frame) return;
    const sep = url.includes("?") ? "&" : "?";
    frame.src = `${url}${sep}_back=${Date.now()}`;
  };
  return (
    <button
      type="button"
      onClick={back}
      className="text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
    >
      {label}
    </button>
  );
}
