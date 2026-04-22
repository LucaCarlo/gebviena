import { prisma } from "./prisma";

/**
 * Fetch all page images for a given page and return a map of section -> imageUrl.
 * Falls back to the provided defaults if no DB record exists.
 */
export async function getPageImages(
  page: string,
  defaults: Record<string, string>
): Promise<Record<string, string>> {
  const dbImages = await prisma.pageImage.findMany({
    where: { page },
  });

  const result = { ...defaults };
  for (const img of dbImages) {
    result[img.section] = img.imageUrl;
  }
  return result;
}

/**
 * Like getPageImages, but also returns per-section linkUrls
 * (only included when a non-empty linkUrl is stored in the DB).
 */
export async function getPageImagesWithLinks(
  page: string,
  defaults: Record<string, string>
): Promise<{ images: Record<string, string>; links: Record<string, string> }> {
  const dbImages = await prisma.pageImage.findMany({ where: { page } });
  const images = { ...defaults };
  const links: Record<string, string> = {};
  for (const img of dbImages) {
    images[img.section] = img.imageUrl;
    if (img.linkUrl && img.linkUrl.trim()) links[img.section] = img.linkUrl;
  }
  return { images, links };
}

/**
 * Fetch card images for related pages.
 * Priority: PageImage "card" section > HeroSlide coverImage > HeroSlide imageUrl
 */
export async function getRelatedCardImages(
  pages: string[]
): Promise<Record<string, string>> {
  const [cardImages, heroSlides] = await Promise.all([
    prisma.pageImage.findMany({
      where: { page: { in: pages }, section: "card" },
    }),
    prisma.heroSlide.findMany({
      where: { page: { in: pages }, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const result: Record<string, string> = {};

  // First, set from hero slides (fallback)
  for (const slide of heroSlides) {
    if (!result[slide.page]) {
      result[slide.page] = slide.coverImage || slide.imageUrl;
    }
  }

  // Override with dedicated card images from PageImage
  for (const img of cardImages) {
    if (img.imageUrl) {
      result[img.page] = img.imageUrl;
    }
  }

  return result;
}
