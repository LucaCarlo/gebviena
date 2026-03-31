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
  source: string; // "newsletter" | "evento" | "entrambi"
  subscriberId: string | null;
  createdAt: string;
  tags: { id: string; name: string; slug: string; color: string }[];
}

export async function GET() {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  // Fetch both sources
  const [subscribers, eventRegs] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, firstName: true, lastName: true, country: true, city: true, createdAt: true },
    }),
  ]);

  // Build unified map by email (lowercase)
  const contactMap = new Map<string, UnifiedContact>();

  for (const s of subscribers) {
    const key = s.email.toLowerCase().trim();
    contactMap.set(key, {
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      company: s.company,
      phone: s.phone,
      source: "newsletter",
      subscriberId: s.id,
      createdAt: s.createdAt.toISOString(),
      tags: [],
    });
  }

  for (const e of eventRegs) {
    const key = e.email.toLowerCase().trim();
    const existing = contactMap.get(key);
    if (existing) {
      existing.source = "entrambi";
      // Fill missing fields from event data
      if (!existing.firstName && e.firstName) existing.firstName = e.firstName;
      if (!existing.lastName && e.lastName) existing.lastName = e.lastName;
    } else {
      contactMap.set(key, {
        email: e.email,
        firstName: e.firstName,
        lastName: e.lastName,
        company: null,
        phone: null,
        source: "evento",
        subscriberId: null,
        createdAt: e.createdAt.toISOString(),
        tags: [],
      });
    }
  }

  // Batch-load tags
  const allEmails = Array.from(contactMap.keys());
  const tagsMap = await getTagsForEmails(allEmails);

  for (const [email, contact] of Array.from(contactMap.entries())) {
    contact.tags = tagsMap[email] || [];
  }

  // Sort by createdAt desc
  const contacts = Array.from(contactMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ success: true, data: contacts, total: contacts.length });
}
