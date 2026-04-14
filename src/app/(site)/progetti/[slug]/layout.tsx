import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";
import { buildAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const lang = getCurrentLang();
  let projectId: string | null = null;

  if (lang !== DEFAULT_LANG) {
    const tr = await prisma.projectTranslation.findFirst({
      where: { languageCode: lang, slug: params.slug },
      select: { projectId: true },
    });
    if (tr) projectId = tr.projectId;
  }
  if (!projectId) {
    const p = await prisma.project.findUnique({ where: { slug: params.slug }, select: { id: true } });
    projectId = p?.id ?? null;
  }
  if (!projectId) return { title: "Progetto non trovato" };

  const raw = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true, slug: true, seoTitle: true, seoDescription: true, coverImage: true,
      translations: { select: { languageCode: true, slug: true, name: true, seoTitle: true, seoDescription: true } },
    },
  });
  if (!raw) return { title: "Progetto non trovato" };

  const tForLang = raw.translations.find((t) => t.languageCode === lang);
  const seoTitle = tForLang?.seoTitle?.trim() || raw.seoTitle?.trim() || `${tForLang?.name || raw.name} | Gebrüder Thonet Vienna`;
  const seoDescription = tForLang?.seoDescription?.trim() || raw.seoDescription?.trim() || undefined;
  const slugByLang: Record<string, string> = { [DEFAULT_LANG]: raw.slug };
  for (const t of raw.translations) if (t.slug) slugByLang[t.languageCode] = t.slug;
  const alternates = await buildAlternates(`/progetti/${raw.slug}`, slugByLang);
  return {
    title: seoTitle, description: seoDescription, alternates,
    openGraph: { title: seoTitle, description: seoDescription, images: raw.coverImage ? [raw.coverImage] : undefined },
  };
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
