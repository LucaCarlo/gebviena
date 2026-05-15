"use client";

import { useLang } from "@/contexts/I18nContext";

/**
 * Hook di traduzione leggero per il frontend store.
 *
 * Lo store supporta solo IT/FR. Invece di un dizionario a chiavi (overkill
 * qui), si passano direttamente le due varianti:
 *
 *   const t = useStoreT();
 *   <button>{t("Aggiungi al carrello", "Ajouter au panier")}</button>
 *
 * Qualsiasi lingua diversa da "fr" usa l'italiano.
 */
export function useStoreT(): (it: string, fr: string) => string {
  const lang = useLang();
  const isFr = lang === "fr";
  return (it: string, fr: string) => (isFr ? fr : it);
}
