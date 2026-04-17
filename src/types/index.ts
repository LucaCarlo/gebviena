export interface PointOfSale {
  id: string;
  name: string;
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
  | "product"
  | "share"
  | "related";

export interface NewsParagraphData {
  title?: string;
  body: string;
}

export interface NewsImageTextBgData {
  title?: string;
  text: string;
  imageUrl: string;
  imagePosition: "left" | "right";
  ctaLabel?: string;
  ctaHref?: string;
}

export interface NewsThreeImagesData {
  images: { url: string; caption: string }[];
}

export interface NewsSingleImageData {
  imageUrl: string;
  caption?: string;
  videoUrl?: string;
}

export interface NewsImageWithParagraphData {
  imageUrl: string;
  videoUrl?: string;
  title?: string;
  body: string;
}

export interface NewsFullwidthBannerData {
  imageUrl: string;
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export type NewsShareData = Record<string, never>;
export type NewsRelatedData = Record<string, never>;

export interface NewsProductData {
  productId: string;
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
    | NewsProductData
    | NewsShareData
    | NewsRelatedData;
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
