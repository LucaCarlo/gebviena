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

export interface Finish {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  category: string;
  colorHex: string | null;
  imageUrl: string | null;
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
  imageUrl: string;
  galleryUrls: string | null;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  designer?: Designer;
  finishes?: Finish[];
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
  imageUrl: string;
  galleryUrls: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  galleryUrls: string | null;
  videoUrl: string | null;
  year: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Award {
  id: string;
  name: string;
  productName: string | null;
  year: number | null;
  organization: string | null;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
  isActive: boolean;
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
  videoUrl: string | null;
  position: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  altText: string | null;
  folder: string;
  createdAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  type: string;
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
  languagesCount: number;
  finishesCount: number;
  mediaFilesCount: number;
  pageViewsCount: number;
  usersCount: number;
}
