import Link from "next/link";
import { Globe, MapPin, Calendar } from "lucide-react";
import SubscribeForm from "@/components/landing/accesso-svendita-gtv/SubscribeForm";

export const metadata = {
  title: "Accesso Riservato — Vendita Speciale | Gebrüder Thonet Vienna",
  description:
    "Registrati per accedere alla Vendita Speciale Gebrüder Thonet Vienna. Sconti fino al 40% online e fino al 70% in showroom a Torino.",
};

export default function AccessoSvenditaGtvPage() {
  return (
    <div className="font-sans bg-white text-dark">
      {/* ─── Header ─── */}
      <header className="px-6 md:px-10 py-5 md:py-6 flex items-center justify-between">
        <Link href="/" className="text-[13px] md:text-[14px] font-medium tracking-[0.18em] uppercase text-dark hover:opacity-70 transition-opacity">
          Gebr&uuml;der Thonet Vienna
        </Link>
        <nav className="hidden sm:flex items-center gap-7 text-[11px] md:text-[12px] font-semibold tracking-[0.14em] uppercase">
          <span className="text-dark border-b-2 border-dark pb-1">Vendita Speciale</span>
          <Link href="/contatti" className="text-warm-600 hover:text-dark transition-colors">Showroom</Link>
          <Link href="/contatti" className="text-warm-600 hover:text-dark transition-colors">Contatti</Link>
        </nav>
      </header>

      {/* ─── Banner placeholder (full bleed) ─── */}
      <section>
        <div className="relative w-full aspect-[24/5] bg-warm-100/70 border-y border-warm-200 flex items-center justify-center">
          <div className="text-center text-warm-400">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-1">Banner</p>
            <p className="text-[11px]">Spazio riservato all&apos;immagine prodotti</p>
          </div>
        </div>
      </section>

      {/* ─── Content: 2-col, 75% width ─── */}
      <section className="px-6 md:px-10 pt-12 md:pt-16 pb-16 md:pb-24">
        <div className="w-full md:w-3/4 max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 lg:gap-20">
          {/* ── Left column ── */}
          <div>
            <p className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.18em] text-warm-600 mb-5">
              Vendita Speciale
            </p>
            <h1 className="text-[34px] md:text-[44px] lg:text-[48px] font-semibold leading-[1.08] text-dark mb-6 tracking-[-0.01em]">
              Accesso Riservato alla Vendita Speciale Gebr&uuml;der Thonet Vienna
            </h1>
            <p className="text-[15px] md:text-[16px] text-warm-700 leading-[1.6] mb-10 max-w-[480px]">
              Due modalit&agrave; di accesso, un&apos;unica selezione: online su registrazione,
              in showroom per una scoperta esclusiva.
            </p>

            {/* ── Info blocks ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-7 gap-x-8 mb-10 max-w-[520px]">
              <InfoBlock
                icon={<Globe size={18} strokeWidth={1.6} />}
                title="Online"
                lines={["Accesso su registrazione", "Selezione disponibile fino a esaurimento"]}
                highlight={["Sconti fino al ", "40%"]}
              />
              <InfoBlock
                icon={<MapPin size={18} strokeWidth={1.6} />}
                title="Showroom Torino"
                lines={[
                  "Via Foggia 23H",
                  "Accesso diretto in showroom",
                  "Pezzi unici da fine serie, shooting e fiere",
                ]}
                highlight={["Sconti fino al ", "70%"]}
              />
              <InfoBlock
                icon={<Calendar size={18} strokeWidth={1.6} />}
                title="Periodo"
                lines={["Dal 15 Maggio al 30 Giugno 2026"]}
              />
            </div>

            {/* ── Long description ── */}
            <div className="space-y-4 text-[14px] md:text-[14.5px] text-warm-700 leading-[1.7] max-w-[520px]">
              <p>
                La Vendita Speciale nasce da un processo di ottimizzazione della nostra logistica
                e supply chain, volto alla centralizzazione e all&apos;efficientamento dei magazzini.
              </p>
              <p>
                Questo percorso ci permette di rendere disponibili una selezione di prodotti
                a condizioni dedicate, attraverso due esperienze distinte:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 marker:text-warm-400">
                <li><strong className="font-semibold text-dark">online</strong>, con articoli disponibili in quantit&agrave; limitata</li>
                <li><strong className="font-semibold text-dark">offline</strong>, con una selezione esclusiva di pezzi unici e fuori produzione</li>
              </ul>
              <p>Due modalit&agrave; diverse, unite dalla stessa attenzione per qualit&agrave; e ricerca.</p>
            </div>
          </div>

          {/* ── Right column: form ── */}
          <div className="md:pt-2">
            <div className="md:sticky md:top-8">
              <SubscribeForm />
              <p className="text-[11px] text-warm-500 leading-[1.7] mt-5 px-1">
                L&apos;accesso online &egrave; riservato agli utenti registrati.
                <br />
                I prodotti disponibili online e in showroom differiscono per tipologia e disponibilit&agrave;.
                <br />
                La registrazione non garantisce disponibilit&agrave; sugli articoli.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Helpers ─── */

function InfoBlock({
  icon,
  title,
  lines,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  highlight?: [string, string];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-warm-700">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warm-700">{title}</span>
      </div>
      <div className="text-[13px] text-warm-700 leading-[1.55] space-y-0.5">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
        {highlight && (
          <p className="pt-1 text-dark">
            {highlight[0]}<span className="font-bold">{highlight[1]}</span>
          </p>
        )}
      </div>
    </div>
  );
}
