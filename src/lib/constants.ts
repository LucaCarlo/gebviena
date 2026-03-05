export const PRODUCT_CATEGORIES = [
  { value: "TUTTI", label: "Tutti" },
  { value: "CLASSICI", label: "i Classici" },
  { value: "NOVITA", label: "Novità 2025" },
  { value: "SEDUTE", label: "Sedute" },
  { value: "IMBOTTITI", label: "Imbottiti" },
  { value: "COMPLEMENTI", label: "Complementi" },
  { value: "TAVOLI", label: "Tavoli" },
  { value: "OUTDOOR", label: "Outdoor" },
] as const;

export const PRODUCT_SUBCATEGORIES = [
  "Sedie", "Sedie con braccioli", "Poltrone", "Divani", "Sgabelli",
  "Tavoli da bar", "Tavolini", "Mobili contenitori", "Appendiabiti",
  "Tavoli da pranzo", "Testiere", "Comodini", "Dondoli", "Lampade",
  "Panche", "Scrivanie", "Servomuto", "Paravento", "Portaombrelli",
  "Pouf", "Specchi", "Tappeti",
] as const;

/** Maps each category to its available subcategories */
export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  TUTTI: [
    "Sedie", "Sedie con braccioli", "Poltrone", "Divani", "Sgabelli",
    "Tavoli da bar", "Tavolini", "Mobili contenitori", "Appendiabiti",
    "Tavoli da pranzo", "Testiere", "Comodini", "Dondoli", "Lampade",
    "Panche", "Scrivanie", "Servomuto", "Paravento", "Portaombrelli",
    "Pouf", "Specchi", "Tappeti",
  ],
  CLASSICI: ["Sedie", "Sgabelli", "Sedie con braccioli", "Appendiabiti", "Dondoli", "Tavoli da pranzo"],
  NOVITA: ["Divani", "Scrivanie", "Sedie", "Sedie con braccioli"],
  SEDUTE: ["Sedie", "Sedie con braccioli", "Sgabelli", "Dondoli", "Panche"],
  IMBOTTITI: ["Poltrone", "Divani", "Pouf"],
  COMPLEMENTI: ["Mobili contenitori", "Appendiabiti", "Testiere", "Lampade", "Servomuto", "Paravento", "Portaombrelli", "Specchi", "Tappeti"],
  TAVOLI: ["Tavoli da bar", "Tavolini", "Tavoli da pranzo", "Comodini", "Scrivanie"],
  OUTDOOR: ["Sedie", "Tavoli da bar"],
};

export const PROJECT_TYPES = [
  { value: "TUTTI", label: "Tutti" },
  { value: "BISTROT_RESTAURANT", label: "Bistrot & Restaurant" },
  { value: "HOTELLERIE", label: "Hotellerie" },
  { value: "RESIDENZIALE", label: "Residenziale" },
  { value: "SPAZI_CULTURALI", label: "Spazi culturali" },
] as const;

export const POS_TYPES = [
  { value: "STORE", label: "Negozio" },
  { value: "AGENT", label: "Agente / Distributore" },
] as const;

export const HERO_POSITIONS = [
  { value: "center", label: "Centro" },
  { value: "left", label: "Sinistra" },
  { value: "right", label: "Destra" },
] as const;

export const HERO_VERTICAL_POSITIONS = [
  { value: "top", label: "Alto" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Basso" },
] as const;

export const HERO_PAGES = [
  { value: "homepage", label: "Homepage" },
  { value: "products", label: "Pagina Prodotti" },
  { value: "projects", label: "Pagina Progetti" },
  { value: "mondo-gtv", label: "Mondo GTV" },
  { value: "professionisti", label: "Professionisti" },
  { value: "brand-manifesto", label: "Brand Manifesto" },
  { value: "heritage", label: "Heritage" },
  { value: "curvatura-legno", label: "La Curvatura del Legno" },
  { value: "sostenibilita", label: "Sostenibilità" },
  { value: "designer-e-premi", label: "Designer e Premi" },
  { value: "experience", label: "GTV Experience" },
  { value: "campagne-video", label: "Campagne & Video" },
  { value: "news", label: "News & Rassegna Stampa" },
  { value: "collaborazioni", label: "Collaborazioni Designer" },
] as const;

/** @deprecated Usa i ruoli dal DB (tabella Role) */
export const USER_ROLES = [
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Amministratore" },
  { value: "editor", label: "Editor" },
  { value: "agent", label: "Agente" },
  { value: "client", label: "Cliente Finale" },
  { value: "designer", label: "Designer" },
  { value: "architect", label: "Architetto" },
] as const;

// ─── Permission System ────────────────────────────────────────────────────────

export const PERMISSION_RESOURCES = [
  { key: "users", label: "Utenti" },
  { key: "roles", label: "Ruoli" },
  { key: "products", label: "Prodotti" },
  { key: "designers", label: "Designer" },
  { key: "projects", label: "Progetti" },
  { key: "campaigns", label: "Campagne" },
  { key: "awards", label: "Premi" },
  { key: "catalogs", label: "Cataloghi" },
  { key: "news", label: "News" },
  { key: "stores", label: "Negozi" },
  { key: "agents", label: "Agenti" },
  { key: "newsletter", label: "Newsletter" },
  { key: "contacts", label: "Messaggi" },
  { key: "forms", label: "Forms" },
  { key: "media", label: "Media" },
  { key: "hero", label: "Hero Slides" },
  { key: "settings", label: "Impostazioni" },
  { key: "analytics", label: "Analisi Traffico" },
  { key: "firma", label: "Firma Email" },
  { key: "import_export", label: "Import/Export" },
] as const;

export const PERMISSION_ACTIONS = [
  { key: "view", label: "Visualizzare" },
  { key: "create", label: "Creare" },
  { key: "edit", label: "Modificare" },
  { key: "delete", label: "Eliminare" },
] as const;

export type PermissionKey = `${(typeof PERMISSION_RESOURCES)[number]["key"]}.${(typeof PERMISSION_ACTIONS)[number]["key"]}`;

/** Generate all permission keys */
export function allPermissionKeys(): PermissionKey[] {
  const keys: PermissionKey[] = [];
  for (const r of PERMISSION_RESOURCES) {
    for (const a of PERMISSION_ACTIONS) {
      keys.push(`${r.key}.${a.key}` as PermissionKey);
    }
  }
  return keys;
}

/** Build a permissions object with all keys set to given value */
export function buildPermissions(value: boolean): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const key of allPermissionKeys()) {
    perms[key] = value;
  }
  return perms;
}

export const MEDIA_FOLDERS = [
  { value: "general", label: "Generale" },
  { value: "products", label: "Prodotti" },
  { value: "projects", label: "Progetti" },
  { value: "designers", label: "Designer" },
  { value: "news", label: "News" },
  { value: "campaigns", label: "Campagne" },
  { value: "hero", label: "Hero" },
] as const;

export const NAV_ITEMS = [
  {
    label: "PRODOTTI",
    href: "/prodotti",
    children: [
      { label: "TUTTI I PRODOTTI", href: "/prodotti" },
      { label: "COMPLEMENTI", href: "/prodotti?category=COMPLEMENTI" },
      { label: "I CLASSICI", href: "/prodotti?category=CLASSICI" },
      { label: "IMBOTTITI", href: "/prodotti?category=IMBOTTITI" },
      { label: "OUTDOOR", href: "/prodotti?category=OUTDOOR" },
      { label: "SEDUTE", href: "/prodotti?category=SEDUTE" },
      { label: "TAVOLI", href: "/prodotti?category=TAVOLI" },
    ],
  },
  {
    label: "PROGETTI",
    href: "/progetti",
    children: [
      { label: "TUTTI I PROGETTI", href: "/progetti" },
      { label: "BISTROT & RESTAURANT", href: "/progetti?type=BISTROT_RESTAURANT" },
      { label: "HOTELLERIE", href: "/progetti?type=HOTELLERIE" },
      { label: "SPAZI CULTURALI", href: "/progetti?type=SPAZI_CULTURALI" },
      { label: "RESIDENZIALI", href: "/progetti?type=RESIDENZIALE" },
    ],
  },
  {
    label: "MONDO GTV",
    href: "/mondo-gtv",
    children: [
      { label: "BRAND MANIFESTO", href: "/mondo-gtv/brand-manifesto" },
      { label: "HERITAGE", href: "/mondo-gtv/heritage" },
      { label: "LA CURVATURA DEL LEGNO", href: "/mondo-gtv/curvatura-legno" },
      { label: "SOSTENIBILITÀ", href: "/mondo-gtv/sostenibilita" },
      { label: "DESIGNER E PREMI", href: "/mondo-gtv/designer-e-premi" },
      { label: "GTV EXPERIENCE", href: "/mondo-gtv/gtv-experience" },
      { label: "CAMPAGNE & VIDEO", href: "/campagne-e-video" },
      { label: "NEWS & RASSEGNA STAMPA", href: "/news-e-rassegna-stampa" },
    ],
  },
  {
    label: "PROFESSIONISTI",
    href: "/professionisti",
    children: [
      { label: "REALIZZAZIONI CUSTOM", href: "/professionisti/realizzazioni-custom" },
      { label: "PROGETTI", href: "/professionisti/progetti" },
      { label: "CATALOGHI", href: "/professionisti/cataloghi" },
      { label: "MATERIALE TECNICO", href: "/professionisti/materiale-tecnico" },
    ],
  },
  {
    label: "CONTATTI",
    href: "/contatti",
    children: [
      { label: "RETE DI VENDITA", href: "/contatti/rete-vendita" },
      { label: "COLLABORAZIONI NUOVI DESIGNER", href: "/contatti/collaborazioni" },
      { label: "UFFICIO STAMPA", href: "/contatti/ufficio-stampa" },
      { label: "RICHIESTA INFORMAZIONI", href: "/contatti/richiesta-info" },
    ],
  },
] as const;

export const FOOTER_LINKS = {
  esplora: [
    { label: "Prodotti", href: "/prodotti" },
    { label: "Progetti", href: "/progetti" },
    { label: "Mondo GTV", href: "/mondo-gtv" },
    { label: "Professionisti", href: "/professionisti" },
    { label: "Contatti", href: "/contatti" },
  ],
  informati: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Condizioni Generali di Vendita", href: "/condizioni-vendita" },
  ],
  seguici: [
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "Pinterest", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "YouTube", href: "#" },
  ],
};
