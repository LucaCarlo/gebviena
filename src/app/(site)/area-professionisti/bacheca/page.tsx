import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { getProT } from "@/lib/pro-translations";
import BachecaClient from "./BachecaClient";

export const dynamic = "force-dynamic";

export default async function BachecaPage() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");

  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">
          {t("dashboard.welcome")}, {pro.firstName} {pro.lastName} · {t(`role.${pro.role}`)}
        </div>
        <h1 className="text-3xl md:text-5xl font-serif text-warm-900 mb-4 tracking-tight">
          Bacheca
        </h1>
        <p className="text-base md:text-lg text-warm-700 mb-10 leading-relaxed max-w-2xl">
          Aggiornamenti e novità per i professionisti: nuovi cataloghi, listino prezzi aggiornato, media, modifiche alle credenziali.
        </p>

        <BachecaClient />

        <div className="mt-12 pt-6 border-t border-warm-200">
          <Link
            href="/area-professionisti"
            className="inline-block text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
          >
            ← Torna alla dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
