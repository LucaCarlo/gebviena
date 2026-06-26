import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { Download, Globe, Mail, MapPin, Phone, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";
const SLUG = "materiale-aziendale";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  const rows = await prisma.setting.findMany({ where: { group: "azienda" } });
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value || "";
  // Risolve la descrizione aziendale nella lingua attiva: chiavi
  // company_description_<lang> sovrascrivono la master "company_description"
  // (italiano). Fallback sempre all'IT se la traduzione è vuota o assente.
  if (lang !== "it") {
    const localized = s[`company_description_${lang}`];
    if (localized && localized.trim()) s.company_description = localized;
  }
  const has = (k: string) => !!s[k]?.trim();

  const logos: Array<{ label: string; url: string; isWhite?: boolean }> = [];
  if (has("company_logo_main"))  logos.push({ label: t("mat.logo.main"),  url: s.company_logo_main });
  if (has("company_logo_white")) logos.push({ label: t("mat.logo.white"), url: s.company_logo_white, isWhite: true });
  if (has("company_logo_dark"))  logos.push({ label: t("mat.logo.dark"),  url: s.company_logo_dark });

  const docs: Array<{ label: string; url: string }> = [];
  if (has("company_profile_pdf"))           docs.push({ label: t("mat.doc.profile"),      url: s.company_profile_pdf });
  if (has("company_brand_guidelines_pdf"))  docs.push({ label: t("mat.doc.brand"),        url: s.company_brand_guidelines_pdf });
  if (has("company_presentation_pdf"))      docs.push({ label: t("mat.doc.presentation"), url: s.company_presentation_pdf });

  const contactItems = [
    { icon: MapPin, label: s.company_address },
    { icon: Phone,  label: s.company_phone,   href: s.company_phone   ? `tel:${s.company_phone}`   : undefined },
    { icon: Mail,   label: s.company_email,   href: s.company_email   ? `mailto:${s.company_email}` : undefined },
    { icon: Globe,  label: s.company_website, href: s.company_website || undefined },
    { icon: Receipt, label: s.company_vat ? `P. IVA ${s.company_vat}` : "" },
  ].filter((c) => c.label?.trim());

  const empty = logos.length === 0 && docs.length === 0 && contactItems.length === 0 && !has("company_description");

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        {has("company_description") ? (
          <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-2xl whitespace-pre-line">
            {s.company_description}
          </p>
        ) : (
          <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-2xl">
            {t("mat.fallback_subtitle")} {s.company_name || "Gebrüder Thonet Vienna"}.
          </p>
        )}

        {empty ? (
          <div className="bg-white border border-warm-200 px-8 py-16 text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">{t("mat.unavailable_title")}</div>
            <p className="text-warm-700 leading-relaxed max-w-md mx-auto">{t("mat.unavailable_body")}</p>
          </div>
        ) : (
          <div className="space-y-10">

            {logos.length > 0 && (
              <section>
                <h2 className="text-[12px] uppercase tracking-[0.2em] text-warm-500 mb-3">{t("mat.section.logos")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {logos.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="group block border border-warm-200 hover:border-warm-900 transition-colors">
                      <div className={`relative aspect-[4/3] flex items-center justify-center p-6 overflow-hidden ${l.isWhite ? "bg-warm-900" : "bg-white"}`}>
                        <Image src={l.url} alt={l.label} width={240} height={120} className="max-w-full max-h-full object-contain" unoptimized />
                      </div>
                      <div className="px-3 py-2 border-t border-warm-200 flex items-center justify-between gap-2 bg-white">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-warm-700">{l.label}</span>
                        <Download size={12} className="text-warm-500 group-hover:text-warm-900" />
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {docs.length > 0 && (
              <section>
                <h2 className="text-[12px] uppercase tracking-[0.2em] text-warm-500 mb-3">{t("mat.section.documents")}</h2>
                <div className="bg-white border border-warm-200 divide-y divide-warm-100">
                  {docs.map((d) => (
                    <div key={d.url} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-warm-50 transition-colors">
                      <div className="text-sm text-warm-900">{d.label}</div>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] border border-warm-300 hover:border-warm-900 hover:bg-warm-50 transition-colors shrink-0">
                        <Download size={12} /> {t("common.download")}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {contactItems.length > 0 && (
              <section>
                <h2 className="text-[12px] uppercase tracking-[0.2em] text-warm-500 mb-3">{t("mat.section.contacts")}</h2>
                <div className="bg-white border border-warm-200 px-5 py-4 space-y-2.5">
                  {contactItems.map((c, i) => {
                    const Icon = c.icon;
                    const content = (
                      <span className="inline-flex items-center gap-3 text-sm text-warm-800">
                        <Icon size={14} className="text-warm-500 shrink-0" />
                        <span>{c.label}</span>
                      </span>
                    );
                    return c.href ? (
                      <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block hover:text-warm-900">
                        {content}
                      </a>
                    ) : (
                      <div key={i}>{content}</div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
