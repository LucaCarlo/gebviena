export interface PointOfSale {
  id: string;
  name: string;
  agentName: string | null;
  type: "STORE" | "AGENT";
  address: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Designer {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  country: string | null;
  imageUrl: string | null;
  website: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  designerName: string;
  designerId: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  materials: string | null;
  dimensions: string | null;
  coverImage: string | null;
  heroImage: string | null;
  sideImage: string | null;
  galleryImages: string | null;
  galleryOrientations: string | null;
  variants: string | null;
  dimensionImage: string | null;
  techSheetUrl: string | null;
  model2dUrl: string | null;
  model3dUrl: string | null;
  pconUrl: string | null;
  pconMoc: string | null;
  pconBan: string | null;
  pconSid: string | null;
  pconOvc: string | null;
  year: number | null;
  imageUrl: string;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
  dimensionBlockId: string | null;
  dimensionValues: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  designer?: Designer;
  projects?: ProjectProduct[];
  extraDimensions?: ProductDimension[];
}

export interface ProductDimension {
  id: string;
  productId: string;
  name: string | null;
  blockId: string | null;
  values: string | null;
  freeText: string | null;
  image: string | null;
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  year: number | null;
  architect: string | null;
  country: string;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string;
  coverImage: string | null;
  heroImage: string | null;
  sideImage: string | null;
  galleryUrls: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  products?: ProjectProduct[];
}

export interface ProjectProduct {
  id: string;
  projectId: string;
  productId: string;
  project?: Project;
  product?: Product;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  type: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  galleryUrls: string | null;
  videoUrl: string | null;
  blocks: string | null;
  year: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Campaign page blocks ───────────────────────────────────────────
export type CampaignBlockType =
  | "paragraph"
  | "image_text"
  | "three_images"
  | "single_image"
  | "image_with_paragraph"
  | "fullwidth_banner";

export interface CampaignParagraphData {
  title?: string;
  body: string;
}

export interface CampaignImageTextData {
  title?: string;
  text: string;
  imageUrl: string;
  imagePosition: "left" | "right";
  secondaryImageUrl?: string;
}

export interface CampaignThreeImagesData {
  images: { url: string; caption: string }[];
}

export interface CampaignSingleImageData {
  imageUrl: string;
  caption?: string;
  videoUrl?: string;
}

export interface CampaignImageWithParagraphData {
  imageUrl: string;
  videoUrl?: string;
  title?: string;
  body: string;
}

export interface CampaignFullwidthBannerData {
  imageUrl: string;
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface CampaignBlock {
  id: string;
  type: CampaignBlockType;
  data:
    | CampaignParagraphData
    | CampaignImageTextData
    | CampaignThreeImagesData
    | CampaignSingleImageData
    | CampaignImageWithParagraphData
    | CampaignFullwidthBannerData;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string | null;
  imageUrl: string;
  galleryUrls: string | null;
  blocks: string | null;
  tags: string | null;
  source: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewsBlockType =
  | "text"
  | "image"
  | "image_text"
  | "gallery"
  | "slideshow"
  | "quote"
  | "video"
  | "separator";

export interface NewsBlock {
  id: string;
  type: NewsBlockType;
  data: TextBlockData | ImageBlockData | ImageTextBlockData | GalleryBlockData | SlideshowBlockData | QuoteBlockData | VideoBlockData | SeparatorBlockData;
}

// v2 block system (like campaigns)
export type NewsBlockV2Type =
  | "paragraph"
  | "image_text_bg"
  | "three_images"
  | "single_image"
  | "image_with_paragraph"
  | "fullwidth_banner"
  | "caslon_title"
  | "two_images_inline"
  | "feature_tool"
  | "cards_row"
  | "faq"
  | "stats"
  | "quote"
  | "timeline"
  | "comparison_table"
  | "single_cta"
  | "product"
  | "share"
  | "related"
  | "columns";

export interface NewsParagraphData {
  title?: string;
  body: string;
}

export interface NewsImageTextBgData {
  title?: string;
  text: string;
  imageUrl: string;
  videoUrl?: string;       // URL video esterno (YouTube/Vimeo) opzionale
  imagePosition: "left" | "right";
  ctaLabel?: string;
  ctaHref?: string;
  // Stile del CTA: "default" = pulsante testuale (com'era); "custom" = sostituisce il
  // testo del pulsante con un'icona SVG/PNG (ctaIconUrl) — utile per loghi store, app icons.
  ctaStyle?: CtaButtonStyle;
  ctaIconUrl?: string;
  // Solo se imageUrl è un file video: true = autoplay muted loop (background),
  // false/undefined = controls visibili, l'utente clicca play.
  videoAutoplay?: boolean;
  videoControls?: boolean;
  // Stile del background della sezione. "warm" è il default storico (warm-50),
  // "white" è bianco puro, "transparent" eredita dal contesto.
  background?: "warm" | "white" | "transparent";
  // Come adatta il media nella colonna: "cover" riempie tutto tagliando se
  // serve (object-cover, default storico); "contain" mostra l'intero media
  // con padding/lettering attorno (object-contain), utile per loghi o foto
  // che non vanno tagliate.
  mediaFit?: "cover" | "contain";
}

export interface NewsThreeImagesData {
  images: { url: string; caption: string; videoUrl?: string }[];
}

export interface NewsSingleImageData {
  imageUrl: string;
  caption?: string;
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
}

export interface NewsImageWithParagraphData {
  imageUrl: string;
  videoUrl?: string;
  title?: string;
  body: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
}

export interface NewsFullwidthBannerData {
  imageUrl: string;
  videoUrl?: string;       // URL video esterno (YouTube/Vimeo) opzionale
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
}

// Titolo grande in Libre Caslon Text — sezione editoriale per stacchi di
// capitolo. Allineamento configurabile a sinistra / centro / destra.
export interface NewsCaslonTitleData {
  text: string;
  align?: "left" | "center" | "right";
}

// Due foto affiancate, con allineamento a sinistra / centro / destra del
// gruppo (sbandiera). Larghezza fissa, due colonne uguali.
export interface NewsTwoImagesInlineData {
  images: { url: string; caption?: string; videoUrl?: string }[];
  align?: "left" | "center" | "right";
  caption?: string;
}

// Block "Strumento / Feature" — immagine + card laterale con logo, paragrafo,
// lista "ideale per" e fino a 2 CTA (anche badge store).
export type CtaButtonStyle = "default" | "custom";
// Effetti hover preset (step 9) — applicati sul tag <a> tramite classi CSS.
export type CtaHoverEffect =
  | "none" | "scale" | "lift" | "underline-grow" | "color-swap" | "glow";
export interface NewsCta {
  label: string;
  href: string;
  style?: CtaButtonStyle;
  iconUrl?: string;   // SVG/PNG custom — se compilato, sostituisce il badge predefinito
  /** Nome icona dalla libreria curata (lucide-react) — vince su iconUrl se settato. */
  iconName?: string;
  /** Effetto hover preset. Default "none". */
  hoverEffect?: CtaHoverEffect;
}
export interface NewsFeatureToolData {
  imageUrl: string;
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
  imagePosition?: "left" | "right";
  logoUrl?: string;       // piccolo SVG/PNG sopra il titolo (es. logo brand)
  title: string;
  description: string;
  bulletsTitle?: string;  // es. "IDEALE PER"
  bullets: string[];      // elenco bullet
  ctas: NewsCta[];        // 0-4 pulsanti
  // Stile gruppo CTA: "boxed" = pulsanti rettangolari distinti (default storico);
  // "icons-divider" = icone affiancate senza sfondo, separate da una stanghetta
  // verticale (utile per loghi store, app icons, brand icons cliccabili).
  // "boxed" = pulsanti completi con sfondo (default).
  // "icons-text-divider" = senza sfondo, icona + testo del pulsante affiancati,
  //   separati da stanghetta verticale.
  // "icons-only-divider" = senza sfondo, solo icona (no testo), separati da stanghetta.
  // (Legacy: "icons-divider" trattato come alias di "icons-only-divider".)
  ctaGroupStyle?: "boxed" | "icons-text-divider" | "icons-only-divider";
  scrollLabel?: string;   // testo sopra il CTA es. "SCARICA PCON.FACTS"
}

// Block "Cards / Come funziona" — fino a 4 card affiancate.
export interface NewsCardItem {
  number?: string;        // es. "01." (auto se vuoto)
  iconUrl?: string;       // SVG/PNG icona (rendering in cerchio nero)
  title: string;
  description?: string;
}
export interface NewsCardsRowData {
  sectionTitle?: string;
  columns?: 2 | 3 | 4;
  autoNumber?: boolean;
  items: NewsCardItem[];
}

// Block "FAQ"
export interface NewsFaqItem {
  question: string;
  answer: string;
}
export interface NewsFaqData {
  sectionTitle?: string;
  items: NewsFaqItem[];
}

// Block "Statistiche" — 2-4 numeri grossi con descrizione
export interface NewsStatItem {
  value: string;          // es. "+500", "10K"
  label: string;          // descrizione breve
}
export interface NewsStatsData {
  sectionTitle?: string;
  items: NewsStatItem[];
  columns?: 2 | 3 | 4;
}

// Block "Citazione" — testo grande tra virgolette + autore
export interface NewsQuoteData {
  text: string;
  author?: string;
  authorRole?: string;
  align?: "left" | "center";
}

// Block "Timeline" — eventi cronologici (data + titolo + descrizione)
export interface NewsTimelineItem {
  date: string;           // es. "1849" o "Marzo 2024"
  title: string;
  description?: string;
}
export interface NewsTimelineData {
  sectionTitle?: string;
  items: NewsTimelineItem[];
}

// Block "Tabella di confronto"
export interface NewsComparisonRow {
  label: string;
  values: string[];        // tanti valori quante sono le colonne
}
export interface NewsComparisonTableData {
  sectionTitle?: string;
  columnHeaders: string[]; // nomi delle colonne di confronto (es. "Base", "Pro", "Enterprise")
  rows: NewsComparisonRow[];
  highlightColumn?: number; // colonna evidenziata (0-based), opzionale
}

// Sezione "Pulsante CTA" — block standalone con titolo + descrizione opzionali
// + uno o piu pulsanti centrati. Usa gli stessi NewsCta del Feature/Strumento.
export interface NewsSingleCtaData {
  title?: string;
  body?: string;
  ctas: NewsCta[];
  // "boxed" = pulsanti completi con sfondo (default).
  // "icons-text-divider" = senza sfondo, icona + testo del pulsante affiancati,
  //   separati da stanghetta verticale.
  // "icons-only-divider" = senza sfondo, solo icona (no testo), separati da stanghetta.
  // (Legacy: "icons-divider" trattato come alias di "icons-only-divider".)
  ctaGroupStyle?: "boxed" | "icons-text-divider" | "icons-only-divider";
  align?: "left" | "center" | "right"; // default center
}

export type NewsShareData = Record<string, never>;
export type NewsRelatedData = Record<string, never>;

export interface NewsProductData {
  productId: string;
}

/**
 * Layout colonne (step 5 editor news). Ogni colonna è una lista lineare di
 * widget atomici (titolo, paragrafo, immagine, CTA, citazione, condividi).
 * Niente template / colonne dentro colonne — l'editor lo enforce a UI.
 * Usiamo `unknown` per i child al posto di NewsBlockV2 ricorsivo perché TS
 * non gestisce bene il self-reference e il payload è validato lato UI.
 */
export type NewsColumnsCount = 2 | 3 | 4;
export type NewsColumnsGap = "sm" | "md" | "lg";
export type NewsColumnsAlign = "top" | "center" | "bottom";
export interface NewsColumnsChild {
  id: string;
  type: NewsBlockV2Type;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  style?: NewsBlockStyle;
}
export interface NewsColumnsData {
  columns: NewsColumnsCount;
  gap?: NewsColumnsGap;
  verticalAlign?: NewsColumnsAlign;
  children: NewsColumnsChild[][]; // children[colIdx][childIdx]
}

/**
 * Override di stile per singolo blocco news. Tutto opzionale → block esistenti
 * senza `style` continuano a renderizzare identici (default code-driven).
 * Valori semantici "none/sm/md/lg/xl" mappati a classi Tailwind statiche nel
 * renderer per restare nel safelist e non rompere il purge CSS.
 */
export type NewsBlockSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type NewsBlockBackground = "default" | "white" | "warm-50" | "warm-100" | "warm-900" | "transparent";
// Font del blocco — chiavi mappate a CSS variables del layout root.
// "default" = inherit dal sito (Work Sans).
export type NewsBlockFont =
  | "default" | "caslon" | "work-sans"
  | "inter" | "playfair" | "lora" | "montserrat" | "roboto" | "poppins";
// Animazioni di entrata (step 8) — applicate al wrapper del blocco quando
// entra nel viewport. "none" = nessuna animazione.
export type NewsBlockAnimation =
  | "none" | "fade-in" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in";
export interface NewsBlockStyle {
  marginTop?: NewsBlockSpacing;
  marginBottom?: NewsBlockSpacing;
  paddingTop?: NewsBlockSpacing;
  paddingBottom?: NewsBlockSpacing;
  background?: NewsBlockBackground;
  /** Sfondo custom (es. "#ff00aa") — vince su `background` se presente. */
  backgroundCustom?: string;
  textFont?: NewsBlockFont;
  /** Colore testo preset slug (es. "black") — applicato via CSS var. */
  textColor?: string;
  /** Colore testo custom hex — vince su `textColor` se presente. */
  textColorCustom?: string;
  /** Animazione di entrata viewport — vedi NewsBlockAnimation. */
  animation?: NewsBlockAnimation;
  /** Delay in ms prima che parta l'animazione. Default 0. */
  animationDelay?: number;
  /** Come l'immagine si adatta al suo contenitore (per blocchi con immagini:
   *  three_images, single_image, image_text_bg, ecc.).
   *  - "cover" (default): l'immagine riempie il box, viene tagliata se l'aspect
   *    non combacia col contenitore.
   *  - "contain": l'immagine si vede tutta dentro il box, può lasciare margini
   *    (bg crema). Buono per foto orizzontali in container portrait. */
  imageFit?: "cover" | "contain";
}

export interface NewsBlockV2 {
  id: string;
  type: NewsBlockV2Type;
  data:
    | NewsParagraphData
    | NewsImageTextBgData
    | NewsThreeImagesData
    | NewsSingleImageData
    | NewsImageWithParagraphData
    | NewsFullwidthBannerData
    | NewsCaslonTitleData
    | NewsTwoImagesInlineData
    | NewsFeatureToolData
    | NewsSingleCtaData
    | NewsCardsRowData
    | NewsFaqData
    | NewsStatsData
    | NewsQuoteData
    | NewsTimelineData
    | NewsComparisonTableData
    | NewsProductData
    | NewsShareData
    | NewsRelatedData
    | NewsColumnsData;
  /** Override di stile opzionale — vedi NewsBlockStyle. Default: niente override. */
  style?: NewsBlockStyle;
}

export interface TextBlockData {
  title?: string;
  body: string;
}

export interface ImageBlockData {
  images: string[];
  layout: "full" | "contained" | "side-by-side";
  caption?: string;
}

export interface ImageTextBlockData {
  images: string[];
  text: string;
  title?: string;
  imagePosition: "left" | "right";
  layout: "50-50" | "40-60" | "60-40";
}

export interface GalleryBlockData {
  images: string[];
  columns: 2 | 3 | 4;
}

export interface SlideshowBlockData {
  images: string[];
}

export interface QuoteBlockData {
  text: string;
  author?: string;
  style: "default" | "handwritten";
}

export interface VideoBlockData {
  url: string;
  caption?: string;
}

export interface SeparatorBlockData {
  height: "small" | "medium" | "large";
}

export interface Award {
  id: string;
  name: string;
  year: number | null;
  organization: string | null;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Catalog {
  id: string;
  name: string;
  slug: string;
  section: string;
  pretitle: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string;
  pdfUrl: string;
  linkText: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  imageUrl: string;
  coverImage: string | null;
  videoUrl: string | null;
  position: string;
  verticalPosition: string;
  imagePosition: string;
  textColor: string;
  darkOverlay: boolean;
  overlayOpacity: number;
  page: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTypology {
  id: string;
  contentType: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  categories?: ContentTypologyCategory[];
}

export interface ContentCategory {
  id: string;
  contentType: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  typologies?: ContentTypologyCategory[];
  subcategories?: ContentSubcategory[];
}

export interface ContentTypologyCategory {
  id: string;
  typologyId: string;
  categoryId: string;
  typology?: ContentTypology;
  category?: ContentCategory;
}

export interface ContentSubcategory {
  id: string;
  categoryId: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  wasabiUrl: string | null;
  wasabiKey: string | null;
  isSynced: boolean;
  syncedAt: string | null;
  altText: string | null;
  folder: string;
  width: number | null;
  height: number | null;
  originalSize: number | null;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  thumbnailSize: number | null;
  mediumUrl: string | null;
  mediumKey: string | null;
  mediumSize: number | null;
  createdAt: string;
}

export interface PageImage {
  id: string;
  page: string;
  section: string;
  label: string;
  imageUrl: string;
  altText: string | null;
  linkUrl: string | null;
  linkUrlI18n: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  type: string;
  company: string | null;
  phone: string | null;
  storeId: string | null;
  contactReason: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  emailSignature: string | null;
  signatureHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageView {
  id: string;
  path: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  group: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface DashboardStats {
  productsCount: number;
  projectsCount: number;
  designersCount: number;
  campaignsCount: number;
  awardsCount: number;
  pointsOfSaleCount: number;
  contactSubmissionsCount: number;
  unreadContactsCount: number;
  heroSlidesCount: number;
  pageImagesCount: number;
  languagesCount: number;
  mediaFilesCount: number;
  pageViewsCount: number;
  usersCount: number;
}
