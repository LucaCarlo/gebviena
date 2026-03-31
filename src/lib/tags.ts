import { prisma } from "@/lib/prisma";

/**
 * Ensure a tag exists (create if not) and assign it to an email.
 * Used by newsletter subscription and event registration flows.
 */
export async function assignTagBySlug(email: string, tagSlug: string, tagName?: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find or create the tag
  let tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: tagName || tagSlug, slug: tagSlug, color: tagSlug === "newsletter" ? "#3b82f6" : "#8b5cf6" },
    });
  }

  // Assign (skip if already assigned)
  await prisma.contactTag.createMany({
    data: [{ email: normalizedEmail, tagId: tag.id }],
    skipDuplicates: true,
  });
}

/**
 * Get all tags for an email address.
 */
export async function getTagsForEmail(email: string) {
  const contacts = await prisma.contactTag.findMany({
    where: { email: email.toLowerCase().trim() },
    include: { tag: true },
  });
  return contacts.map((c) => ({ id: c.tag.id, name: c.tag.name, slug: c.tag.slug, color: c.tag.color }));
}

/**
 * Get all tags for multiple emails at once (batched).
 */
export async function getTagsForEmails(emails: string[]) {
  const normalized = emails.map((e) => e.toLowerCase().trim());
  const contacts = await prisma.contactTag.findMany({
    where: { email: { in: normalized } },
    include: { tag: true },
  });

  const map: Record<string, { id: string; name: string; slug: string; color: string }[]> = {};
  for (const c of contacts) {
    if (!map[c.email]) map[c.email] = [];
    map[c.email].push({ id: c.tag.id, name: c.tag.name, slug: c.tag.slug, color: c.tag.color });
  }
  return map;
}
