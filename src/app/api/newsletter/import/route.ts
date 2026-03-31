import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { assignTagBySlug } from "@/lib/tags";

export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "create");
  if (isErrorResponse(result)) return result;

  try {
    const { rows } = await req.json();
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun dato da importare" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let tagged = 0;

    for (const row of rows) {
      const email = (row.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) { skipped++; continue; }

      const trimOrNull = (v: string | undefined | null) => v?.trim() || null;
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {
          ...(row.firstName && { firstName: row.firstName.trim() }),
          ...(row.lastName && { lastName: row.lastName.trim() }),
          ...(row.company && { company: row.company.trim() }),
          ...(row.phone && { phone: row.phone.trim() }),
          ...(row.profile && { profile: row.profile.trim() }),
          ...(row.address && { address: row.address.trim() }),
          ...(row.city && { city: row.city.trim() }),
          ...(row.zip && { zip: row.zip.trim() }),
          ...(row.province && { province: row.province.trim() }),
          ...(row.country && { country: row.country.trim() }),
          ...(row.website && { website: row.website.trim() }),
          ...(row.notes && { notes: row.notes.trim() }),
        },
        create: {
          email,
          firstName: trimOrNull(row.firstName),
          lastName: trimOrNull(row.lastName),
          company: trimOrNull(row.company),
          phone: trimOrNull(row.phone),
          profile: trimOrNull(row.profile),
          address: trimOrNull(row.address),
          city: trimOrNull(row.city),
          zip: trimOrNull(row.zip),
          province: trimOrNull(row.province),
          country: trimOrNull(row.country),
          website: trimOrNull(row.website),
          notes: trimOrNull(row.notes),
          acceptsPrivacy: true,
          acceptsUpdates: true,
        },
      });
      imported++;

      // Assign tags if provided
      if (row.tags) {
        const tagNames = (row.tags as string).split(",").map((t: string) => t.trim()).filter(Boolean);
        for (const tagName of tagNames) {
          const slug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
          await assignTagBySlug(email, slug, tagName);
          tagged++;
        }
      }
    }

    return NextResponse.json({ success: true, imported, skipped, tagged });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
