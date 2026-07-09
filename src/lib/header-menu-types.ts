/**
 * Struttura del menu header dinamico, editabile dall'admin.
 * Salvato in Setting.value (key='header.menu', group='header') come JSON string.
 */

export type HeaderMenuLang = "it" | "en" | "de" | "fr" | "es";

export interface HeaderMenuItem {
  /** ID stabile (cuid o slug), usato come key React e riferimento parent nelle move ops. */
  id: string;
  /** Labels multilingua. `it` deve essere sempre presente; le altre sono opzionali (fallback a it). */
  labels: Partial<Record<HeaderMenuLang, string>>;
  /** URL interno (`/prodotti`) o esterno (`https://...`). Puo' contenere querystring. */
  href: string;
  /** true = apre in nuova tab (target=_blank). Default false. */
  external?: boolean;
  /** false nasconde la voce dal frontend ma la lascia visibile in admin per riattivarla. */
  isActive: boolean;
  /** Figli nested (max 2 livelli di nesting: children di children). */
  children?: HeaderMenuItem[];
}

export const HEADER_MENU_LANGS: HeaderMenuLang[] = ["it", "en", "de", "fr", "es"];
