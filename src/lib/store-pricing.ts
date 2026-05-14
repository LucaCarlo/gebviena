/**
 * Pricing helpers per il mercato (IT / FR).
 *
 * Modello:
 *  - Listino (no IVA) è UN solo valore condiviso, presente nelle varianti.
 *  - "IVA inclusa" e "Scontato (IVA inclusa)" hanno 2 valori distinti, uno per
 *    mercato: priceCents / salePriceCents (IT) e priceFrCents / salePriceFrCents (FR).
 *  - Per qualunque lingua diversa da "fr" si applicano i prezzi IT (default).
 *  - In FR se manca il prezzo FR si ricade sul prezzo IT (così non si vende
 *    a 0 — è il comportamento più sicuro di default).
 *  - Il "market" deciso dalla lingua dello store (lang === "fr" → FR).
 *  - L'IVA è informativa (compresa nel prezzo): IT 22% (2200bp), FR 20% (2000bp).
 */

export type Market = "IT" | "FR";

/** Codice mercato dalla lingua dello store (qualsiasi cosa ≠ fr → IT). */
export function marketFromLang(lang: string | null | undefined): Market {
  return (lang || "").toLowerCase() === "fr" ? "FR" : "IT";
}

/** Codice mercato dal country ISO dell'indirizzo di spedizione. */
export function marketFromCountry(country: string | null | undefined): Market {
  return (country || "").toUpperCase() === "FR" ? "FR" : "IT";
}

/** Aliquota IVA (basis points, /10000) per mercato. */
export function vatRateBp(market: Market): number {
  return market === "FR" ? 2000 : 2200;
}

export interface VariantPriceFields {
  priceCents: number;
  salePriceCents: number | null;
  priceFrCents: number | null;
  salePriceFrCents: number | null;
}

export interface ResolvedPrice {
  /** Prezzo "base" IVA inclusa per il mercato (= barrato sulla card se c'è sale). */
  basePriceCents: number;
  /** Prezzo scontato IVA inclusa per il mercato (null se non scontato). */
  salePriceCents: number | null;
  /** Prezzo effettivamente pagato (sale se valido < base, altrimenti base). */
  effectivePriceCents: number;
}

/**
 * Risolve i prezzi della variante per il mercato richiesto.
 * In FR ricade su IT se priceFrCents non è valorizzato (così non rischiamo
 * di vendere a 0 per varianti vecchie non ancora popolate con prezzi FR).
 */
export function resolveVariantPrice(v: VariantPriceFields, market: Market): ResolvedPrice {
  let base: number;
  let sale: number | null;
  if (market === "FR") {
    base = v.priceFrCents != null && v.priceFrCents > 0 ? v.priceFrCents : v.priceCents;
    sale = v.salePriceFrCents != null && v.salePriceFrCents > 0 ? v.salePriceFrCents : null;
  } else {
    base = v.priceCents;
    sale = v.salePriceCents != null && v.salePriceCents > 0 ? v.salePriceCents : null;
  }
  const effective = sale != null && sale < base ? sale : base;
  return { basePriceCents: base, salePriceCents: sale, effectivePriceCents: effective };
}
