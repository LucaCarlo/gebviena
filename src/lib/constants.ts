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
  { value: "curvatura-legno", label: "La Curvatura del Legno" },
  { value: "sostenibilita", label: "Sostenibilità" },
  { value: "designer-e-premi", label: "Designer e Premi" },
  { value: "experience", label: "GTV Experience" },
  { value: "campagne-video", label: "Campagne & Video" },
  { value: "news", label: "News & Rassegna Stampa" },
  { value: "collaborazioni", label: "Collaborazioni Designer" },
  { value: "contatti", label: "Contatti" },
  { value: "cataloghi", label: "Cataloghi" },
  { value: "materiale-tecnico", label: "Schede Tecniche" },
  { value: "ufficio-stampa", label: "Ufficio Stampa" },
  { value: "rete-vendita", label: "Rete di Vendita" },
  { value: "richiesta-info", label: "Richiesta Informazioni" },
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
  { key: "dashboard", label: "Dashboard" },
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
  { key: "newsletter", label: "Utenti" },
  { key: "contacts", label: "Messaggi" },
  { key: "forms", label: "Forms" },
  { key: "media", label: "Media" },
  { key: "hero", label: "Hero Slides" },
  { key: "page_images", label: "Immagini Pagine" },
  { key: "settings", label: "Impostazioni" },
  { key: "analytics", label: "Analisi Traffico" },
  { key: "firma", label: "Firma Email" },
  { key: "import_export", label: "Import/Export" },
  { key: "landing_page", label: "Landing Page" },
  { key: "email_templates", label: "Template Email" },
  { key: "email_analytics", label: "Analitiche Email" },
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

export const PAGE_IMAGES_CONFIG: {
  page: string;
  label: string;
  images: { section: string; label: string; defaultUrl: string; acceptVideo?: boolean; aspectRatio?: number }[];
}[] = [
  {
    page: "menu",
    label: "Menu (sidebar)",
    images: [
      { section: "featured", label: "Immagine in evidenza nel menu", defaultUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=600&fit=crop&q=80", aspectRatio: 1/0.85 },
    ],
  },
  {
    page: "homepage",
    label: "Homepage",
    images: [
      { section: "featured-ambiance", label: "Featured Product — Ambiance", defaultUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&h=2000&fit=crop&q=85", aspectRatio: 3/5 },
      { section: "featured-product", label: "Featured Product — Prodotto", defaultUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=1200&fit=crop&q=85", aspectRatio: 3/4 },
      { section: "banner-fullwidth", label: "Banner a tutta larghezza", defaultUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=2560&h=1700&fit=crop&q=90", aspectRatio: 3/2 },
      { section: "spotlight-ambiance", label: "Product Spotlight — Ambiance", defaultUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=2000&fit=crop&q=85", aspectRatio: 3/5 },
      { section: "spotlight-product", label: "Product Spotlight — Prodotto", defaultUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=900&h=1200&fit=crop&q=85", aspectRatio: 3/4 },
      { section: "born-in-vienna", label: "Born in Vienna — Immagine storica", defaultUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1400&h=900&fit=crop&q=85", aspectRatio: 14/9 },
      { section: "wood-craftsmanship-video", label: "L'armonia del legno — Video", defaultUrl: "https://assets.mixkit.co/videos/44862/44862-720.mp4", acceptVideo: true },
    ],
  },
  {
    page: "mondo-gtv",
    label: "Mondo GTV",
    images: [
      { section: "hero", label: "Hero", defaultUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=800&fit=crop" },
      { section: "heritage-section", label: "Sezione Heritage", defaultUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&h=1080&fit=crop" },
      { section: "wood-craftsmanship", label: "L'arte del legno curvato", defaultUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=1000&fit=crop" },
    ],
  },
  {
    page: "professionisti",
    label: "Professionisti",
    images: [
      { section: "hero", label: "Hero", defaultUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop" },
    ],
  },
  {
    page: "prodotti-dettaglio",
    label: "Pagina Prodotto",
    images: [
      { section: "supporto-professionisti", label: "Supporto ai professionisti", defaultUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&q=80", aspectRatio: 1 },
    ],
  },
  {
    page: "contatti",
    label: "Contatti",
    images: [
      { section: "hero", label: "Hero", defaultUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop" },
    ],
  },
  {
    page: "heritage",
    label: "Heritage",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
      { section: "thonet-family", label: "Michael Thonet e figli", defaultUrl: "/images/Michael-Thonet-centre-with-his-five-sons.jpg" },
      { section: "sedia-n1", label: "Sedia N.1", defaultUrl: "/images/heritage-sedia-n1.webp" },
      { section: "sedia-n4", label: "Sedia N.4", defaultUrl: "/images/heritage-sedia-n4.webp" },
      { section: "hayworth-kelly", label: "Rita Hayworth e Gene Kelly", defaultUrl: "/images/hayworth-kelly.webp" },
      { section: "le-corbusier", label: "Le Corbusier", defaultUrl: "/images/le-corbusier.webp" },
      { section: "winston-churchill", label: "Winston Churchill", defaultUrl: "/images/winston-churchill.webp" },
      { section: "heritage-journal", label: "Heritage Journal", defaultUrl: "/images/heritage-journal.webp" },
      { section: "coin-authenticity", label: "La Moneta GTV", defaultUrl: "/images/GTV-coin-authenticity.jpg" },
    ],
  },
  {
    page: "brand-manifesto",
    label: "Brand Manifesto",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
      { section: "born-in-vienna", label: "Born in Vienna — Michael Thonet 1853", defaultUrl: "/images/michael-thonet-1853.jpg" },
    ],
  },
  {
    page: "curvatura-legno",
    label: "La Curvatura del Legno",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
      { section: "tecnica-legname", label: "La Tecnica", defaultUrl: "/images/tecnica-legname.webp" },
      { section: "curvatura-detail", label: "Curvatura — dettaglio", defaultUrl: "/images/curvatura-img-1536x865.webp" },
      { section: "brevetto", label: "Il Brevetto", defaultUrl: "/images/curvatura-brevetto.webp" },
    ],
  },
  {
    page: "sostenibilita",
    label: "Sostenibilità",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
      { section: "legno-fsc", label: "Legno Certificato FSC", defaultUrl: "/images/sostenibilita-legno.jpg" },
    ],
  },
  {
    page: "designer-e-premi",
    label: "Designer e Premi",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
    ],
  },
  {
    page: "gtv-experience",
    label: "GTV Experience",
    images: [
      { section: "card", label: "Card — Potrebbe interessarti", defaultUrl: "", aspectRatio: 3/4 },
      { section: "stories", label: "Storie, visioni, ispirazioni", defaultUrl: "/images/experience-stories.webp" },
      { section: "lobby", label: "Lobby", defaultUrl: "/images/experience-lobby.webp" },
      { section: "landscape-1", label: "Veduta 1", defaultUrl: "/images/foto-landscape-double-1.webp" },
      { section: "landscape-2", label: "Veduta 2", defaultUrl: "/images/foto-landscape-double-2.webp" },
      { section: "corridors", label: "I Corridoi", defaultUrl: "/images/experience-corridors.webp" },
      { section: "camera-1", label: "Camera 1", defaultUrl: "/images/INTERNO_MARCHE_023_17-683x1024.jpg" },
      { section: "camera-2", label: "Camera 2", defaultUrl: "/images/InternoMarche-34-751x1024.jpg" },
      { section: "camera-3", label: "Camera 3", defaultUrl: "/images/INTERNO_MARCHE_023_16-742x1024.jpg" },
      { section: "carousel-1", label: "Slideshow — Magistretti", defaultUrl: "/images/Magistretti-G03_1-2048x1365.jpg" },
      { section: "carousel-2", label: "Slideshow — Secessione Viennese", defaultUrl: "/images/Secessione-Viennese-G07_1-2048x1861.jpg" },
      { section: "carousel-3", label: "Slideshow — Arts & Crafts", defaultUrl: "/images/ArtsCrafts-G05_3-2048x1666.jpg" },
      { section: "carousel-4", label: "Slideshow — Thonet 303 (1)", defaultUrl: "/images/Thonet-303_1-2048x1365.jpg" },
      { section: "carousel-5", label: "Slideshow — Thonet 303 (2)", defaultUrl: "/images/Thonet-303_6-2048x1486.jpg" },
      { section: "gamfratesi", label: "Vivi la GTV Experience", defaultUrl: "/images/GamFratesi.jpg" },
    ],
  },
  {
    page: "realizzazioni-custom",
    label: "Realizzazioni Custom",
    images: [
      { section: "main", label: "Immagine principale", defaultUrl: "/images/professionisti-realizzazioni.webp" },
    ],
  },
  {
    page: "ufficio-stampa",
    label: "Ufficio Stampa",
    images: [
      { section: "main", label: "Immagine principale", defaultUrl: "/images/PEERS-design-by-Front-for-GTV-2-1024x768.jpg" },
    ],
  },
  {
    page: "richiesta-info",
    label: "Richiesta Informazioni",
    images: [
      { section: "hero", label: "Hero", defaultUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop" },
    ],
  },
  {
    page: "rete-vendita",
    label: "Rete di Vendita",
    images: [
      { section: "hero-bg", label: "Sfondo Hero", defaultUrl: "/foto-gebvienna/rete-di-vendita.png" },
    ],
  },
];

export const MEDIA_FOLDERS = [
  { value: "general", label: "Generale" },
  { value: "products", label: "Prodotti" },
  { value: "projects", label: "Progetti" },
  { value: "designers", label: "Designer" },
  { value: "news", label: "News" },
  { value: "campaigns", label: "Campagne" },
  { value: "hero", label: "Hero" },
  { value: "premi", label: "Premi" },
  { value: "tech-sheets", label: "Schede tecniche e 2D/3D" },
] as const;

export const NAV_ITEMS = [
  {
    label: "PRODOTTI",
    i18nKey: "menu.products",
    href: "/prodotti",
    children: [
      { label: "TUTTI I PRODOTTI", i18nKey: "menu.products.all", href: "/prodotti" },
      { label: "COMPLEMENTI", i18nKey: "menu.products.complementi", href: "/prodotti?category=COMPLEMENTI" },
      { label: "I CLASSICI", i18nKey: "menu.products.classici", href: "/prodotti?category=CLASSICI" },
      { label: "IMBOTTITI", i18nKey: "menu.products.imbottiti", href: "/prodotti?category=IMBOTTITI" },
      { label: "OUTDOOR", i18nKey: "menu.products.outdoor", href: "/prodotti?category=OUTDOOR" },
      { label: "SEDUTE", i18nKey: "menu.products.sedute", href: "/prodotti?category=SEDUTE" },
      { label: "TAVOLI", i18nKey: "menu.products.tavoli", href: "/prodotti?category=TAVOLI" },
    ],
  },
  {
    label: "PROGETTI",
    i18nKey: "menu.projects",
    href: "/progetti",
    children: [
      { label: "TUTTI I PROGETTI", i18nKey: "menu.projects.all", href: "/progetti" },
      { label: "BISTROT & RESTAURANT", i18nKey: "menu.projects.bistrot", href: "/progetti?type=BISTROT_RESTAURANT" },
      { label: "HOTELLERIE", i18nKey: "menu.projects.hotellerie", href: "/progetti?type=HOTELLERIE" },
      { label: "SPAZI CULTURALI", i18nKey: "menu.projects.cultural", href: "/progetti?type=SPAZI_CULTURALI" },
      { label: "RESIDENZIALI", i18nKey: "menu.projects.residential", href: "/progetti?type=RESIDENZIALE" },
    ],
  },
  {
    label: "MONDO GTV",
    i18nKey: "menu.world",
    href: "/mondo-gtv",
    children: [
      { label: "BRAND MANIFESTO", i18nKey: "menu.world.manifesto", href: "/mondo-gtv/brand-manifesto" },
      { label: "HERITAGE", i18nKey: "menu.world.heritage", href: "/mondo-gtv/heritage" },
      { label: "LA CURVATURA DEL LEGNO", i18nKey: "menu.world.wood", href: "/mondo-gtv/curvatura-legno" },
      { label: "SOSTENIBILITÀ", i18nKey: "menu.world.sustainability", href: "/mondo-gtv/sostenibilita" },
      { label: "DESIGNER E PREMI", i18nKey: "menu.world.designers", href: "/mondo-gtv/designer-e-premi" },
      { label: "GTV EXPERIENCE", i18nKey: "menu.world.experience", href: "/mondo-gtv/gtv-experience" },
      { label: "CAMPAGNE & VIDEO", i18nKey: "menu.campaigns", href: "/campagne-e-video" },
      { label: "NEWS & RASSEGNA STAMPA", i18nKey: "menu.news", href: "/news-e-rassegna-stampa" },
    ],
  },
  {
    label: "PROFESSIONISTI",
    i18nKey: "menu.professionals",
    href: "/professionisti",
    children: [
      { label: "REALIZZAZIONI CUSTOM", i18nKey: "menu.professionals.custom", href: "/professionisti/realizzazioni-custom" },
      { label: "PROGETTI", i18nKey: "menu.projects", href: "/progetti" },
      { label: "CATALOGHI", i18nKey: "menu.professionals.catalogs", href: "/professionisti/cataloghi" },
      { label: "MATERIALE TECNICO", i18nKey: "menu.professionals.tech", href: "/professionisti/materiale-tecnico" },
    ],
  },
  {
    label: "CONTATTI",
    i18nKey: "menu.contact",
    href: "/contatti",
    children: [
      { label: "RETE DI VENDITA", i18nKey: "menu.contact.sales", href: "/contatti/rete-vendita" },
      { label: "COLLABORAZIONI NUOVI DESIGNER", i18nKey: "menu.contact.collab", href: "/contatti/collaborazioni" },
      { label: "UFFICIO STAMPA", i18nKey: "menu.contact.press", href: "/contatti/ufficio-stampa" },
      { label: "RICHIESTA INFORMAZIONI", i18nKey: "menu.contact.info", href: "/contatti/richiesta-info" },
      { label: "LANDING PAGE", i18nKey: "menu.contact.landing", href: "/evento-mdw-2026" },
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
