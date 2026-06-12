import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { buildPconUrl } from "@/lib/pcon";
import { getProSettings, isSectionVisible } from "@/lib/pro-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const SLUG = "pcon";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");

  const settings = await getProSettings();
  if (settings.areaDisabled) redirect("/area-professionisti/manutenzione");
  if (!isSectionVisible(settings, pro.role, SLUG, true)) redirect("/area-professionisti");

  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  // Prodotto di apertura: se l'admin ha scelto uno slug, carico la sua
  // configurazione pCon (ban/sid/ovc/moc). Se il prodotto non esiste o non
  // ha pCon configurato, fallback alla home del configuratore (solo lang).
  let pconParams: Parameters<typeof buildPconUrl>[0] = { lang, showCatalogBar: true };
  if (settings.pconProductSlug) {
    const product = await prisma.product.findUnique({
      where: { slug: settings.pconProductSlug },
      select: { pconBan: true, pconSid: true, pconOvc: true, pconMoc: true },
    });
    if (product && product.pconBan) {
      pconParams = {
        lang,
        showCatalogBar: true,
        ban: product.pconBan, sid: product.pconSid, ovc: product.pconOvc, moc: product.pconMoc,
      };
    }
  }
  const pconUrl = buildPconUrl(pconParams);

  return (
    <main className="min-h-screen bg-warm-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <div>
            <Link
              href="/area-professionisti"
              className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-2"
            >
              {t("common.back_to_dashboard")}
            </Link>
            <h1 className="text-2xl md:text-3xl font-serif text-warm-900 tracking-tight">
              {section.label}
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Il "torna al catalogo" è ora integrato in pCon (sh=true)
                quindi non serve un pulsante esterno custom. */}
            <a
              href={pconUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
            >
              {t("pcon.open_new_tab")}
            </a>
          </div>
        </div>

        <div className="bg-white border border-warm-200 overflow-hidden">
          <iframe
            name="pcon-iframe"
            src={pconUrl}
            title="pCon"
            className="w-full"
            style={{ height: "calc(100vh - 200px)", minHeight: "640px", border: 0 }}
            allow="clipboard-write; fullscreen"
          />
        </div>
      </div>
    </main>
  );
}
