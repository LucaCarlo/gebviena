/**
 * Default UI strings (Italian).
 * The admin page /admin/translations lets users override these in any other language.
 * Public pages will use t(key) to render: override[lang] ?? base[key] ?? key.
 *
 * Add new keys here freely. Removing a key is OK too; orphaned overrides remain in DB
 * but won't be shown anywhere.
 */
export interface UiStringDef {
  key: string;
  defaultValue: string;
  description?: string; // shown in admin to help context
}

export interface UiStringGroup {
  id: string;
  label: string;
  strings: UiStringDef[];
}

export const UI_STRING_GROUPS: UiStringGroup[] = [
  {
    id: "nav",
    label: "Menu di navigazione",
    strings: [
      { key: "nav.home", defaultValue: "Home" },
      { key: "nav.products", defaultValue: "Prodotti" },
      { key: "nav.designers", defaultValue: "Designer" },
      { key: "nav.projects", defaultValue: "Progetti" },
      { key: "nav.campaigns", defaultValue: "Campagne e Video" },
      { key: "nav.news", defaultValue: "News e Rassegna stampa" },
      { key: "nav.world", defaultValue: "Mondo GTV" },
      { key: "nav.professionals", defaultValue: "Professionisti" },
      { key: "nav.contact", defaultValue: "Contatti" },
    ],
  },
  {
    id: "footer",
    label: "Footer",
    strings: [
      { key: "footer.copyright", defaultValue: "© Gebrüder Thonet Vienna" },
      { key: "footer.privacy", defaultValue: "Privacy Policy" },
      { key: "footer.cookies", defaultValue: "Cookie Policy" },
      { key: "footer.newsletter.title", defaultValue: "Iscriviti alla newsletter" },
      { key: "footer.newsletter.button", defaultValue: "Iscriviti" },
      { key: "footer.newsletter.placeholder", defaultValue: "La tua email" },
      { key: "footer.language", defaultValue: "Lingua" },
    ],
  },
  {
    id: "common",
    label: "Pulsanti / etichette comuni",
    strings: [
      { key: "common.discover", defaultValue: "Scopri di più" },
      { key: "common.contact_us", defaultValue: "Contattaci" },
      { key: "common.read_more", defaultValue: "Leggi di più" },
      { key: "common.download", defaultValue: "Scarica" },
      { key: "common.view_all", defaultValue: "Vedi tutti" },
      { key: "common.search", defaultValue: "Cerca" },
      { key: "common.loading", defaultValue: "Caricamento…" },
      { key: "common.back", defaultValue: "Indietro" },
      { key: "common.close", defaultValue: "Chiudi" },
      { key: "common.share", defaultValue: "Condividi" },
    ],
  },
  {
    id: "products",
    label: "Pagina prodotti",
    strings: [
      { key: "products.title", defaultValue: "Prodotti" },
      { key: "products.subtitle", defaultValue: "Le sedute e i tavoli che hanno fatto la storia del design viennese." },
      { key: "products.filter.all", defaultValue: "Tutti" },
      { key: "products.filter.designer", defaultValue: "Designer" },
      { key: "products.filter.category", defaultValue: "Categoria" },
      { key: "products.empty", defaultValue: "Nessun prodotto trovato." },
      { key: "products.detail.materials", defaultValue: "Materiali" },
      { key: "products.detail.dimensions", defaultValue: "Dimensioni" },
      { key: "products.detail.designer", defaultValue: "Designer" },
      { key: "products.detail.year", defaultValue: "Anno" },
      { key: "products.detail.tech_sheet", defaultValue: "Scheda tecnica" },
      { key: "products.detail.request_info", defaultValue: "Richiedi informazioni" },
    ],
  },
  {
    id: "forms",
    label: "Form (contatti, registrazione, ecc.)",
    strings: [
      { key: "form.name", defaultValue: "Nome" },
      { key: "form.surname", defaultValue: "Cognome" },
      { key: "form.email", defaultValue: "Email" },
      { key: "form.phone", defaultValue: "Telefono" },
      { key: "form.company", defaultValue: "Azienda" },
      { key: "form.message", defaultValue: "Messaggio" },
      { key: "form.subject", defaultValue: "Oggetto" },
      { key: "form.privacy_consent", defaultValue: "Acconsento al trattamento dei miei dati personali." },
      { key: "form.send", defaultValue: "Invia" },
      { key: "form.success", defaultValue: "Messaggio inviato con successo." },
      { key: "form.error", defaultValue: "Si è verificato un errore. Riprova." },
      { key: "form.required", defaultValue: "Campo obbligatorio" },
    ],
  },
];

export const UI_STRINGS_BY_KEY: Record<string, UiStringDef> = UI_STRING_GROUPS.reduce(
  (acc, g) => {
    for (const s of g.strings) acc[s.key] = s;
    return acc;
  },
  {} as Record<string, UiStringDef>
);

export function getDefaultString(key: string): string {
  return UI_STRINGS_BY_KEY[key]?.defaultValue ?? key;
}
