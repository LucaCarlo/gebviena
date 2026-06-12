import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";

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

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        <p className="text-base text-warm-700 leading-relaxed mb-12 max-w-2xl">{section.description}</p>

        <div className="bg-white border border-warm-200 px-8 py-16 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">{t("common.in_progress")}</div>
          <p className="text-warm-700 leading-relaxed max-w-md mx-auto">
            {t("placeholder.press_kit.body")}{" "}
            {t("placeholder.press_kit.contact")}{" "}
            <a href="mailto:press@gebruederthonetvienna.com" className="underline hover:text-warm-900">press@gebruederthonetvienna.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
