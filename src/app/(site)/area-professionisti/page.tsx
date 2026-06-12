import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { getProT } from "@/lib/pro-translations";
import { prisma } from "@/lib/prisma";
import { getProSettings, isSectionVisible } from "@/lib/pro-settings";
import LogoutButton from "./LogoutButton";
import { getSectionsForRole } from "./_lib/sections";

export const dynamic = "force-dynamic";

export default async function AreaProfessionistiPage() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");

  // Settings dell'area: se l'admin ha disattivato l'area, vai a manutenzione
  // (l'accesso resta attivo perché /accesso non passa di qui).
  const settings = await getProSettings();
  if (settings.areaDisabled) redirect("/area-professionisti/manutenzione");

  // La lingua delle pagine area pro segue quella dell'header del sito
  // (URL prefix /fr, /en, ecc.). Il campo `pro.language` viene usato solo come
  // lingua di default al login (vedi AccessoForm).
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  // Sezioni default per il ruolo + override da admin (nasconde quelle disabilitate).
  const sections = getSectionsForRole(pro.role, lang).filter((s) =>
    isSectionVisible(settings, pro.role, s.slug, true),
  );

  // Conteggio bacheca non letti: notifiche visibili per il ruolo del prof,
  // meno quelle già marcate come lette nella tabella read.
  const [totalNotifs, readNotifs] = await Promise.all([
    prisma.professionalNotification.count({
      where: { OR: [{ audience: null }, { audience: pro.role }] },
    }),
    prisma.professionalNotificationRead.count({
      where: {
        professionalId: pro.id,
        notification: { OR: [{ audience: null }, { audience: pro.role }] },
      },
    }),
  ]);
  const unreadCount = Math.max(0, totalNotifs - readNotifs);

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">
          {t("dashboard.welcome")}, {pro.firstName} {pro.lastName} · {t(`role.${pro.role}`)}
        </div>
        <h1 className="text-3xl md:text-5xl font-serif text-warm-900 mb-4 tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-base md:text-lg text-warm-700 mb-12 leading-relaxed max-w-2xl">
          {t("dashboard.subtitle")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bacheca: card sempre presente, con pallino rosso se ci sono novità non lette */}
          <Link
            href="/area-professionisti/bacheca"
            className="group relative block bg-white border border-warm-200 hover:border-warm-900 transition-colors p-6"
          >
            {unreadCount > 0 && (
              <span
                className="absolute top-4 right-4 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-medium leading-none"
                aria-label={`${unreadCount} novità non lette`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <h2 className="text-lg md:text-xl font-serif text-warm-900 mb-2 leading-tight group-hover:text-warm-700">
              Bacheca
            </h2>
            <p className="text-sm text-warm-700 leading-relaxed">
              {unreadCount > 0
                ? `${unreadCount} ${unreadCount === 1 ? "novità non letta" : "novità non lette"}: cataloghi, listini, media e aggiornamenti.`
                : "Aggiornamenti e novità: cataloghi, listini, media, credenziali."}
            </p>
            <div className="mt-4 text-[11px] uppercase tracking-[0.15em] text-warm-900 inline-flex items-center gap-2">
              {unreadCount > 0 ? "Leggi le novità" : t("dashboard.cta.open")}
            </div>
          </Link>

          {sections.map((s) => (
            <Link
              key={s.slug}
              href={`/area-professionisti/${s.slug}`}
              className="group block bg-white border border-warm-200 hover:border-warm-900 transition-colors p-6"
            >
              <h2 className="text-lg md:text-xl font-serif text-warm-900 mb-2 leading-tight group-hover:text-warm-700">
                {s.label}
              </h2>
              <p className="text-sm text-warm-700 leading-relaxed">
                {s.description}
              </p>
              <div className="mt-4 text-[11px] uppercase tracking-[0.15em] text-warm-900 inline-flex items-center gap-2">
                {t("dashboard.cta.open")}
              </div>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6 mt-12 pt-6 border-t border-warm-200">
          <Link
            href="/area-professionisti/account"
            className="inline-block text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
          >
            {t("dashboard.cta.manage_account")}
          </Link>
          <LogoutButton label={t("dashboard.cta.logout")} />
        </div>
      </div>
    </main>
  );
}
