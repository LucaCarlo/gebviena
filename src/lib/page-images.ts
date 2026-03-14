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
