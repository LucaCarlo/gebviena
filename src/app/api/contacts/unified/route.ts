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
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const tag = (searchParams.get("tag") || "").trim();
  const invited = (searchParams.get("invited") || "all").trim(); // "all" | "true" | "false"

  // ─── 1. Load both data sources in parallel ───
  const [subscribers, eventRegs] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, firstName: true, lastName: true, country: true, city: true, createdAt: true },
    }),
  ]);

  // ─── 2. Merge into a single map keyed by lowercase email ───
  const contactMap = new Map<string, UnifiedContact>();

  for (const s of subscribers) {
    const key = s.email.toLowerCase().trim();
    contactMap.set(key, {
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
      source: "newsletter",
      subscriberId: s.id,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt?.toISOString() || null,
      tags: [],
    });
  }

  for (const e of eventRegs) {
    const key = e.email.toLowerCase().trim();
    const existing = contactMap.get(key);
    if (existing) {
      existing.source = "entrambi";
      if (!existing.firstName && e.firstName) existing.firstName = e.firstName;
      if (!existing.lastName && e.lastName) existing.lastName = e.lastName;
      if (!existing.country && e.country) existing.country = e.country;
      if (!existing.city && e.city) existing.city = e.city;
    } else {
      contactMap.set(key, {
        email: e.email,
        firstName: e.firstName,
        lastName: e.lastName,
        company: null,
        phone: null,
        profile: null,
        address: null,
        city: e.city,
        zip: null,
        province: null,
        country: e.country,
        website: null,
        notes: null,
        source: "evento",
        subscriberId: null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: null,
        tags: [],
      });
    }
  }

  // ─── 3. Tag enrichment in batch ───
  const allEmails = Array.from(contactMap.keys());
  const tagsMap = await getTagsForEmails(allEmails);
  for (const [email, contact] of Array.from(contactMap.entries())) {
    contact.tags = tagsMap[email] || [];
  }

  // ─── 4. Apply filters (tag → invited → search) ───
  let contacts = Array.from(contactMap.values());

  let hasLandingPage = false;
  if (tag) {
    contacts = contacts.filter((c) => c.tags.some((t) => t.slug === tag));

    // Detect linked landing page (for the "invited" filter UI hint)
    const lp = await prisma.landingPageConfig.findFirst({
      where: { tagSlug: tag },
      select: { id: true },
    });
    if (lp) {
      hasLandingPage = true;
      if (invited !== "all") {
        const invitations = await prisma.eventInvitation.findMany({
          where: { landingPageId: lp.id },
          select: { email: true },
        });
        const invitedSet = new Set(invitations.map((i) => i.email.toLowerCase().trim()));
        if (invited === "true") {
          contacts = contacts.filter((c) => invitedSet.has(c.email.toLowerCase().trim()));
        } else if (invited === "false") {
          contacts = contacts.filter((c) => !invitedSet.has(c.email.toLowerCase().trim()));
        }
      }
    }
  }

  if (search) {
    contacts = contacts.filter((c) =>
      c.email.toLowerCase().includes(search) ||
      (c.firstName || "").toLowerCase().includes(search) ||
      (c.lastName || "").toLowerCase().includes(search) ||
      (c.company || "").toLowerCase().includes(search) ||
      (c.city || "").toLowerCase().includes(search) ||
      (c.country || "").toLowerCase().includes(search)
    );
  }

  // ─── 5. Sort by createdAt desc, then paginate in memory ───
  contacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalCount = contacts.length;
  const sliced = contacts.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    success: true,
    data: sliced,
    totalCount,
    page,
    pageSize,
    hasMore: page * pageSize < totalCount,
    hasLandingPage,
  });
}
