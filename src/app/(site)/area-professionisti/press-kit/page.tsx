import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { FileText, Download } from "lucide-react";

export const dynamic = "force-dynamic";
const SLUG = "press-kit";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  // PDF caricati dall'admin nel tab Press kit di Gestione Professionisti
  // (Catalog con section="press-kit"). Solo i record attivi sono mostrati.
  const items = await prisma.catalog.findMany({
    where: { section: SLUG, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, title: true, description: true, imageUrl: true, pdfUrl: true, linkText: true },
  });

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-2xl">{section.description}</p>

        {items.length === 0 ? (
          <div className="bg-white border border-warm-200 px-8 py-16 text-center">
            <FileText size={28} className="mx-auto text-warm-400 mb-3" />
            <p className="text-warm-700 leading-relaxed max-w-md mx-auto">{t("press.empty") === "press.empty" ? "Nessun documento disponibile al momento." : t("press.empty")}</p>
          </div>
        ) : (
          <ul className="bg-white border border-warm-200 divide-y divide-warm-100">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 px-5 py-4">
                <FileText size={20} className="text-warm-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-warm-900 truncate">{it.title || it.name}</div>
                  {it.description && <div className="text-[12px] text-warm-500 mt-0.5 truncate">{it.description}</div>}
                </div>
                {it.pdfUrl && (
                  <a
                    href={it.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-warm-900 border border-warm-300 hover:bg-warm-100 px-3 py-1.5 rounded transition-colors"
                  >
                    <Download size={12} />
                    {it.linkText || t("common.download_pdf")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
