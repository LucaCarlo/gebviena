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
  source: string; // "newsletter" | "evento" | "entrambi" | "tag" | "landing_svendita"
  subscriberId: string | null;
  languageCode: string | null; // lingua dell'utente al momento dell'iscrizione
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
  const format = (searchParams.get("format") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const tag = (searchParams.get("tag") || "").trim();
  const invited = (searchParams.get("invited") || "all").trim(); // "all" | "true" | "false"
  const checkedIn = (searchParams.get("checkedIn") || "all").trim(); // "all" | "true" | "false"
  const langFilter = (searchParams.get("lang") || "all").trim(); // "all" | codice lingua (it/en/de/fr/es/...)

  // ─── 1. Load all sources in parallel ───
  // ContactTag is a third source: contacts imported via CSV may have only tags
  // (no NewsletterSubscriber / EventRegistration row). They still need to show up.
  const [subscribers, eventRegs, taggedEmails] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, firstName: true, lastName: true, country: true, city: true, languageCode: true, createdAt: true },
    }),
    prisma.contactTag.findMany({
      select: { email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
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
      languageCode: s.languageCode || null,
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
      if (!existing.languageCode && e.languageCode) existing.languageCode = e.languageCode;
      // Data prima iscrizione: la più antica fra subscriber e event registration
      const eIso = e.createdAt.toISOString();
      if (eIso < existing.createdAt) existing.createdAt = eIso;
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
        languageCode: e.languageCode || null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: null,
        tags: [],
      });
    }
  }

  // Tag-only contacts (CSV-imported emails without subscriber/event row).
  // Aggiorniamo anche per i contatti già presenti: se un tag è più vecchio,
  // arretra la data "prima iscrizione".
  for (const t of taggedEmails) {
    const key = t.email.toLowerCase().trim();
    const existingTag = contactMap.get(key);
    if (existingTag) {
      const tIso = t.createdAt.toISOString();
      if (tIso < existingTag.createdAt) existingTag.createdAt = tIso;
      continue;
    }
    contactMap.set(key, {
      email: t.email,
      firstName: null,
      lastName: null,
      company: null,
      phone: null,
      profile: null,
      address: null,
      city: null,
      zip: null,
      province: null,
      country: null,
      website: null,
      notes: null,
      source: "tag",
      subscriberId: null,
      languageCode: null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: null,
      tags: [],
    });
  }

  // ─── 3. Tag enrichment in batch ───
  const allEmails = Array.from(contactMap.keys());
  const tagsMap = await getTagsForEmails(allEmails);
  // Slug dei tag che indicano un'iscrizione via landing svendita: gli iscritti
  // tramite quella landing finiscono nella tabella NewsletterSubscriber ma
  // concettualmente vengono da una landing dedicata, non dall'iscrizione
  // newsletter generica. Sovrascriviamo `source` in modo che la lista mostri
  // "Vendita Speciale" invece di "Newsletter".
  const SVENDITA_TAG_SLUGS = new Set(["accesso-svendita-gtv", "accesso-vendita-speciale-gtv"]);
  for (const [email, contact] of Array.from(contactMap.entries())) {
    contact.tags = tagsMap[email] || [];
    if (contact.source === "newsletter" && contact.tags.some((t) => SVENDITA_TAG_SLUGS.has(t.slug))) {
      contact.source = "landing_svendita";
    }
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

  // ─── 4a. Lingua filter ───
  if (langFilter !== "all") {
    if (langFilter === "unknown") {
      contacts = contacts.filter((c) => !c.languageCode);
    } else {
      contacts = contacts.filter((c) => c.languageCode === langFilter);
    }
  }

  // ─── 4b. Check-in filter (per i contatti con EventRegistration) ───
  // Considera "checked-in" un contatto la cui email ha almeno una EventRegistration con checkedIn=true.
  let checkedInSet: Set<string> | null = null;
  if (checkedIn !== "all") {
    const eventEmails = contacts.filter((c) => c.source === "evento" || c.source === "entrambi").map((c) => c.email);
    if (eventEmails.length > 0) {
      const checkins = await prisma.eventRegistration.findMany({
        where: { email: { in: eventEmails }, checkedIn: true },
        select: { email: true },
      });
      checkedInSet = new Set(checkins.map((r) => r.email.toLowerCase().trim()));
    } else {
      checkedInSet = new Set();
    }
    if (checkedIn === "true") {
      contacts = contacts.filter((c) => checkedInSet!.has(c.email.toLowerCase().trim()));
    } else if (checkedIn === "false") {
      contacts = contacts.filter((c) => !checkedInSet!.has(c.email.toLowerCase().trim()));
    }
  }

  // ─── 5. Sort: di default createdAt desc; opzionale via sortBy/sortDir ───
  const sortByParam = (searchParams.get("sortBy") || "").trim();
  const sortDirParam = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const ALLOWED_SORT = new Set(["createdAt", "email", "firstName", "lastName", "company", "city", "country", "languageCode", "source"]);
  const sortBy = ALLOWED_SORT.has(sortByParam) ? sortByParam as keyof UnifiedContact : "createdAt" as keyof UnifiedContact;
  contacts.sort((a, b) => {
    const av = (a[sortBy] ?? "") as string | number;
    const bv = (b[sortBy] ?? "") as string | number;
    let cmp: number;
    if (sortBy === "createdAt") cmp = new Date(av as string).getTime() - new Date(bv as string).getTime();
    else cmp = String(av).toLowerCase().localeCompare(String(bv).toLowerCase(), "it");
    return sortDirParam === "asc" ? cmp : -cmp;
  });
  const totalCount = contacts.length;

  // ─── 6-0. format=ids → tutti gli email+subscriberId che matchano i filtri
  // (no paginazione). Serve al "Seleziona tutti" cross-pagina lato admin. ───
  if (format === "ids") {
    return NextResponse.json({
      success: true,
      totalCount,
      contacts: contacts.map((c) => ({ email: c.email, subscriberId: c.subscriberId })),
    });
  }

  // ─── 6a. CSV export (no pagination) ───
  if (format === "csv") {
    // Per CSV serve sempre lo stato checkedIn (anche se non filtrato), così l'utente lo vede.
    if (!checkedInSet) {
      const eventEmails = contacts.filter((c) => c.source === "evento" || c.source === "entrambi").map((c) => c.email);
      if (eventEmails.length > 0) {
        const checkins = await prisma.eventRegistration.findMany({
          where: { email: { in: eventEmails }, checkedIn: true },
          select: { email: true },
        });
        checkedInSet = new Set(checkins.map((r) => r.email.toLowerCase().trim()));
      } else {
        checkedInSet = new Set();
      }
    }

    const esc = (v: string | null | undefined) => {
      const s = String(v ?? "");
      if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = [
      "Email", "Nome", "Cognome", "Azienda", "Telefono", "Profilo",
      "Indirizzo", "Citta", "CAP", "Provincia", "Paese",
      "Sito", "Note", "Sorgente", "Lingua", "Tag", "Check-in", "Registrato il",
    ].join(",");
    const rows = contacts.map((c) => [
      esc(c.email),
      esc(c.firstName), esc(c.lastName), esc(c.company), esc(c.phone), esc(c.profile),
      esc(c.address), esc(c.city), esc(c.zip), esc(c.province), esc(c.country),
      esc(c.website), esc(c.notes),
      esc(c.source),
      esc(c.languageCode || ""),
      esc(c.tags.map((t) => t.name).join("; ")),
      esc(checkedInSet!.has(c.email.toLowerCase().trim()) ? "si" : "no"),
      esc(c.createdAt),
    ].join(","));
    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = tag ? `contatti-${tag}-${new Date().toISOString().slice(0, 10)}.csv` : `contatti-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // ─── 6b. Paginate in memory (default) ───
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
