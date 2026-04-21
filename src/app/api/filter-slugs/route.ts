import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const revalidate = 60;

const LANGS = ["it", "en", "de", "fr", "es"] as const;
type Lang = (typeof LANGS)[number];

interface FilterEntry {
  value: string;
  slugs: Record<Lang, string>;
}

function buildSlugs(baseLabel: string, translations: { languageCode: string; label: string }[]): Record<Lang, string> {
  const byLang = new Map<string, string>();
  for (const tr of translations) byLang.set(tr.languageCode, tr.label);
  const out = {} as Record<Lang, string>;
  for (const lang of LANGS) {
    const label = byLang.get(lang) || baseLabel;
    out[lang] = slugify(label);
  }
  return out;
}

export async function GET() {
  const [typologies, categories] = await Promise.all([
    prisma.contentTypology.findMany({
      where: { contentType: "products", isActive: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.contentCategory.findMany({
      where: { contentType: { in: ["projects", "news", "campaigns"] }, isActive: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const products: FilterEntry[] = typologies.map((t) => ({
    value: t.value,
    slugs: buildSlugs(t.label, t.translations),
  }));

  const byType: Record<string, FilterEntry[]> = { projects: [], news: [], campaigns: [] };
  for (const c of categories) {
    const entry: FilterEntry = { value: c.value, slugs: buildSlugs(c.label, c.translations) };
    if (byType[c.contentType]) byType[c.contentType].push(entry);
  }

  return NextResponse.json({
    success: true,
    data: {
      products,
      projects: byType.projects,
      news: byType.news,
      campaigns: byType.campaigns,
    },
  });
}
