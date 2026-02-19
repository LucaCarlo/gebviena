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

export const FINISH_CATEGORIES = [
  { value: "LEGNO", label: "Legno" },
  { value: "TESSUTO", label: "Tessuto" },
  { value: "METALLO", label: "Metallo" },
  { value: "PELLE", label: "Pelle" },
  { value: "LACCATO", label: "Laccato" },
] as const;

export const HERO_POSITIONS = [
  { value: "center", label: "Centro" },
  { value: "left", label: "Sinistra" },
  { value: "right", label: "Destra" },
] as const;

export const USER_ROLES = [
  { value: "admin", label: "Amministratore" },
  { value: "editor", label: "Editore" },
  { value: "viewer", label: "Visualizzatore" },
] as const;

export const MEDIA_FOLDERS = [
  { value: "general", label: "Generale" },
  { value: "products", label: "Prodotti" },
  { value: "projects", label: "Progetti" },
  { value: "designers", label: "Designer" },
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
  },
  {
    label: "MONDO GTV",
    href: "/mondo-gtv",
  },
  {
    label: "PROFESSIONISTI",
    href: "/professionisti",
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
