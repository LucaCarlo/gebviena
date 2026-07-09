/**
 * Sincronizza i campi NON linguistici dei blocchi tra master IT e traduzioni.
 *
 * Quando l'admin aggiunge un nuovo campo di CONFIGURAZIONE (es. `ctas`,
 * `ctaGroupStyle`, `imagePosition`, `imageFit`, ...) al blocco in IT, le
 * traduzioni non lo ricevono automaticamente e finiscono con struttura vecchia.
 *
 * Questo helper prende il blocco master IT e il blocco tradotto (stesso index)
 * e ritorna un nuovo blocco che:
 *   - eredita TUTTI i campi da master (config visiva, layout, immagini, ecc.)
 *   - PRESERVA i campi tradotti (title, text, body, ctaLabel, ...) dalla
 *     traduzione se esistono
 *   - per array di oggetti (es. `ctas`, `images[].caption`, `cards`, ...) fa il
 *     merge item-per-item preservando solo i campi linguistici della traduzione
 *   - se la traduzione ha un legacy `ctaLabel` e il master ha migrato a `ctas`,
 *     usa quel testo come label del primo CTA (evita perdita label tradotta).
 */

// Chiavi che sono TESTO TRADOTTO — preservare dalla traduzione, non copiare dal master
const LANG_KEYS = new Set<string>([
  "title",
  "text",
  "body",
  "subtitle",
  "caption",
  "ctaLabel",
  "label",
  "quote",
  "author",
  "question",
  "answer",
  "description",
  "name",
  "header",
  "pretitle",
  "sourceLabel",
  "pillLabel",
  "alt",
  "role",
  "eyebrow",
  "footer",
  "buttonLabel",
  "ariaLabel",
  "value", // per stats (es. "10 anni")
]);

interface BlockLike {
  type?: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
}

function mergeItemArrays(masterArr: unknown, transArr: unknown): unknown {
  if (!Array.isArray(masterArr)) return masterArr;
  if (!Array.isArray(transArr)) return masterArr;
  return masterArr.map((mItem, i) => {
    const tItem = transArr[i];
    if (!tItem || typeof tItem !== "object" || typeof mItem !== "object" || mItem === null) return mItem;
    const out: Record<string, unknown> = { ...(mItem as Record<string, unknown>) };
    for (const [k, v] of Object.entries(tItem as Record<string, unknown>)) {
      if (LANG_KEYS.has(k) && (typeof v === "string" || typeof v === "number")) {
        out[k] = v;
      }
    }
    return out;
  });
}

export function syncBlockFields(masterBlock: BlockLike, transBlock: BlockLike | null | undefined): BlockLike {
  // Se il tipo differisce (edge case) o la traduzione manca, restituisci il master intero
  if (!transBlock || masterBlock.type !== transBlock.type) return masterBlock;

  const masterData = (masterBlock.data || {}) as Record<string, unknown>;
  const transData = (transBlock.data || {}) as Record<string, unknown>;

  const outData: Record<string, unknown> = { ...masterData };

  // 1) Preserva tutti i campi linguistici scalari dalla traduzione
  for (const key of Object.keys(masterData)) {
    if (LANG_KEYS.has(key) && key in transData) {
      const v = transData[key];
      if (typeof v === "string") outData[key] = v;
    }
  }
  // Preserva anche eventuali chiavi lang presenti in traduzione ma non in master (retrocompat)
  for (const key of Object.keys(transData)) {
    if (LANG_KEYS.has(key) && !(key in outData)) {
      const v = transData[key];
      if (typeof v === "string") outData[key] = v;
    }
  }

  // 2) Merge array di oggetti item-per-item (ctas, images, cards, faq, stats, columns, ...)
  for (const key of Object.keys(masterData)) {
    if (Array.isArray(masterData[key])) {
      outData[key] = mergeItemArrays(masterData[key], transData[key]);
    }
  }

  // 3) Retrocompat: se master ha migrato ctas ma traduzione ha ancora legacy ctaLabel,
  //    usa quel testo come label del primo CTA (senno' si perderebbe la label tradotta).
  if (Array.isArray(outData.ctas) && outData.ctas.length > 0 && typeof transData.ctaLabel === "string" && !Array.isArray(transData.ctas)) {
    const arr = outData.ctas as Array<Record<string, unknown>>;
    const first = arr[0];
    if (first && typeof first === "object" && (!first.label || first.label === (masterData.ctas as Array<Record<string, unknown>> | undefined)?.[0]?.label)) {
      arr[0] = { ...first, label: transData.ctaLabel };
    }
  }

  return { ...masterBlock, ...transBlock, type: masterBlock.type, data: outData };
}

/**
 * Sincronizza un intero array di blocchi.
 * masterBlocks è la SOURCE OF TRUTH per struttura/ordine/config.
 * transBlocks fornisce solo i testi tradotti.
 */
export function syncBlocks(masterBlocks: BlockLike[] | null | undefined, transBlocks: BlockLike[] | null | undefined): BlockLike[] {
  if (!Array.isArray(masterBlocks)) return [];
  if (!Array.isArray(transBlocks)) return masterBlocks;
  return masterBlocks.map((m, i) => syncBlockFields(m, transBlocks[i] || null));
}

/**
 * Parse safe di stringa JSON blocks. Ritorna null se non valida.
 */
export function safeParseBlocks(raw: unknown): BlockLike[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
