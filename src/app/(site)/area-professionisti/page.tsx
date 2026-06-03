import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthProfessional } from "@/lib/professional-auth";
import { getCurrentLang } from "@/lib/i18n";
import { headers } from "next/headers";
import { getDefaultString } from "@/lib/ui-strings";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

// Mini-helper t() server-side: legge gli override dal DB per la lingua corrente
// e cade sui default di ui-strings. Replica la logica di useT() lato client.
async function buildT(lang: string) {
  const overrideRows = await prisma.uiTranslationOverride.findMany({
    where: { languageCode: lang, key: { startsWith: "pro." } },
    select: { key: true, value: true },
  }).catch(() => [] as Array<{ key: string; value: string }>);
  const map = new Map(overrideRows.map((r) => [r.key, r.value] as const));
  return (key: string): string => map.get(key) ?? getDefaultString(key);
}

export default async function AreaProfessionistiPage() {
  // Lingua corrente (header x-gtv-lang impostato dal middleware) con fallback "it".
  let lang = "it";
  try {
    const h = headers();
    lang = h.get("x-gtv-lang") || getCurrentLang() || "it";
  } catch { /* runtime sync wrapper */ }

  const pro = await getAuthProfessional();
  if (!pro) {
    // Niente accesso → redirect alla home, dove l'utente può aprire il drawer.
    const prefix = lang === "it" ? "" : `/${lang}`;
    redirect(`${prefix}/`);
  }

  const t = await buildT(lang);

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">
          {t("pro.page.welcome")} {pro.firstName} {pro.lastName}
        </div>
        <h1 className="text-3xl md:text-5xl font-serif text-warm-900 mb-4 tracking-tight">
          {t("pro.page.title")}
        </h1>
        <p className="text-lg md:text-xl text-warm-700 mb-8 leading-relaxed">
          {t("pro.page.subtitle")}
        </p>
        <p className="text-[15px] text-warm-600 leading-relaxed mb-10 max-w-2xl">
          {t("pro.page.body")}
        </p>

        <div className="flex items-center gap-4">
          <Link
            href={lang === "it" ? "/" : `/${lang}/`}
            className="inline-block text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
          >
            ← {lang === "fr" ? "Retour au site" : lang === "en" ? "Back to site" : lang === "de" ? "Zur Webseite" : lang === "es" ? "Volver al sitio" : "Torna al sito"}
          </Link>
          <LogoutButton label={t("pro.cta.logout")} />
        </div>
      </div>
    </main>
  );
}
