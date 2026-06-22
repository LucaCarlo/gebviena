import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { prisma } from "@/lib/prisma";
import DigitalMediaClient from "./DigitalMediaClient";

export const dynamic = "force-dynamic";
const SLUG = "digital-media";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  // Carica tipologie (categorie) e prodotti con almeno una foto pro
  const [typologies, productImages, typologyImages] = await Promise.all([
    prisma.contentTypology.findMany({
      where: { contentType: "products", isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { translations: true },
    }),
    prisma.professionalImage.findMany({
      where: { isActive: true, productId: { not: null } },
      include: {
        product: { select: { id: true, name: true, slug: true, category: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.professionalImage.findMany({
      where: { isActive: true, typology: { not: null }, productId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const typologiesData = typologies.map((tp) => {
    const tr = tp.translations.find((x) => x.languageCode === lang);
    return { value: tp.value, label: tr?.label || tp.label };
  });

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-3xl">{section.description}</p>

        <DigitalMediaClient
          typologies={typologiesData}
          productImages={productImages.map((i) => ({
            id: i.id,
            fileUrl: i.fileUrl,
            fileName: i.fileName,
            productId: i.productId,
            productName: i.product?.name || "",
            productSlug: i.product?.slug || "",
            productCategory: i.product?.category || "",
          }))}
          typologyImages={typologyImages.map((i) => ({
            id: i.id,
            fileUrl: i.fileUrl,
            fileName: i.fileName,
            typology: i.typology || "",
          }))}
        />
      </div>
    </main>
  );
}
