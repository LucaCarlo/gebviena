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

      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {
          ...(row.firstName && { firstName: row.firstName.trim() }),
          ...(row.lastName && { lastName: row.lastName.trim() }),
          ...(row.company && { company: row.company.trim() }),
          ...(row.phone && { phone: row.phone.trim() }),
        },
        create: {
          email,
          firstName: (row.firstName || "").trim() || null,
          lastName: (row.lastName || "").trim() || null,
          company: (row.company || "").trim() || null,
          phone: (row.phone || "").trim() || null,
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
