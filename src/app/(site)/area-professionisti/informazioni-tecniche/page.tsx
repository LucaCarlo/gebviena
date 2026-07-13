import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import InformazioniTecnicheClient from "./InformazioniTecnicheClient";

export const dynamic = "force-dynamic";
const SLUG = "informazioni-tecniche";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  // pre-fetch dati. Esclude varianti commerciali (`verniciature-custom`) e
  // prodotti senza categoria: stesso filtro di /api/products/tech-sheets.
  const all = await prisma.product.findMany({
    where: {
      isActive: true,
      excludeFromCatalog: false,
      OR: [
        { techSheetUrl: { not: null } },
        { model2dUrl: { not: null } },
        { model3dUrl: { not: null } },
        { instructionsUrl: { not: null } },
        { careUrl: { not: null } },
      ],
    },
    select: {
      id: true, name: true, designerName: true,
      techSheetUrl: true, model2dUrl: true, model3dUrl: true,
      instructionsUrl: true, careUrl: true, category: true,
    },
    orderBy: { name: "asc" },
  });
  const products = all.filter((p) => {
    const cat = (p.category || "").trim();
    if (!cat) return false;
    if (cat.toLowerCase().startsWith("verniciature")) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        <p className="text-base text-warm-700 leading-relaxed mb-12 max-w-2xl">{t("info.intro")}</p>

        <InformazioniTecnicheClient
          initialProducts={products}
          i18n={{
            tabSchedeCad: t("info.tab.schedeCad"),
            tabInstructions: t("info.tab.instructions"),
            tabCare: t("info.tab.care"),
            loading: t("common.loading"),
            empty: t("info.empty"),
            sheet: t("info.col.sheet"),
            downloadPdf: t("common.download_pdf"),
            typology: {
              SEDUTE: t("typology.SEDUTE"),
              IMBOTTITI: t("typology.IMBOTTITI"),
              COMPLEMENTI: t("typology.COMPLEMENTI"),
              TAVOLI: t("typology.TAVOLI"),
              OUTDOOR: t("typology.OUTDOOR"),
              ALTRO: t("typology.ALTRO"),
            },
          }}
        />
      </div>
    </main>
  );
}
