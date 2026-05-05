import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { getTagsForEmails } from "@/lib/tags";

interface UnifiedContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  profile: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  province: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  source: string; // "newsletter" | "evento" | "entrambi"
  subscriberId: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: { id: string; name: string; slug: string; color: string }[];
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(req: Request) {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const search = (searchParams.get("search") || "").trim();
  const tag = (searchParams.get("tag") || "").trim();
  const invited = (searchParams.get("invited") || "all").trim(); // "all" | "true" | "false"

  // Resolve tag → email allowlist + landing page (if linked)
  let tagEmailWhitelist: string[] | null = null;
  let landingPageIdForTag: string | null = null;
  let hasLandingPage = false;

  if (tag) {
    const tagRecord = await prisma.tag.findUnique({ where: { slug: tag } });
    if (!tagRecord) {
      return NextResponse.json({
        success: true, data: [], totalCount: 0, page, pageSize, hasMore: false, hasLandingPage: false,
      });
    }
    const contactTags = await prisma.contactTag.findMany({
      where: { tagId: tagRecord.id },
      select: { email: true },
    });
    tagEmailWhitelist = Array.from(new Set(contactTags.map((c) => c.email.toLowerCase().trim())));

    const lp = await prisma.landingPageConfig.findFirst({ where: { tagSlug: tag }, select: { id: true } });
    if (lp) {
      landingPageIdForTag = lp.id;
      hasLandingPage = true;
    }
  }

  // Apply invited filter (only meaningful inside a tag tab connected to a landing)
  if (tag && invited !== "all" && landingPageIdForTag && tagEmailWhitelist) {
    const invitations = await prisma.eventInvitation.findMany({
      where: { landingPageId: landingPageIdForTag },
      select: { email: true },
    });
    const invitedSet = new Set(invitations.map((i) => i.email.toLowerCase().trim()));
    if (invited === "true") {
      tagEmailWhitelist = tagEmailWhitelist.filter((e) => invitedSet.has(e));
    } else if (invited === "false") {
      tagEmailWhitelist = tagEmailWhitelist.filter((e) => !invitedSet.has(e));
    }
  }

  // Build subscriber WHERE clause
  const where: Record<string, unknown> = {};
  if (tagEmailWhitelist !== null) {
    where.email = { in: tagEmailWhitelist };
  }
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { company: { contains: search } },
      { city: { contains: search } },
      { country: { contains: search } },
    ];
  }

  // Count + page
  const totalCount = await prisma.newsletterSubscriber.count({ where });
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Enrich
  const emails = subscribers.map((s) => s.email);
  const [tagsMap, eventRegs] = await Promise.all([
    getTagsForEmails(emails),
    prisma.eventRegistration.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
  ]);
  const eventEmailSet = new Set(eventRegs.map((e) => e.email.toLowerCase().trim()));

  const data: UnifiedContact[] = subscribers.map((s) => {
    const key = s.email.toLowerCase().trim();
    return {
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      company: s.company,
      phone: s.phone,
      profile: s.profile,
      address: s.address,
      city: s.city,
      zip: s.zip,
      province: s.province,
      country: s.country,
      website: s.website,
      notes: s.notes,
      source: eventEmailSet.has(key) ? "entrambi" : "newsletter",
      subscriberId: s.id,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt?.toISOString() || null,
      tags: tagsMap[key] || [],
    };
  });

  return NextResponse.json({
    success: true,
    data,
    totalCount,
    page,
    pageSize,
    hasMore: page * pageSize < totalCount,
    hasLandingPage,
  });
}
