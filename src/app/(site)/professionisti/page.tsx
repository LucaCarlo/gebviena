import Link from "next/link";
import { getPageImages } from "@/lib/page-images";
import PageHero from "@/components/PageHero";

const DEFAULTS: Record<string, string> = {
  hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop",
};

export default async function ProfessionistiPage() {
  const imgs = await getPageImages("professionisti", DEFAULTS);

  return (
    <>
      {/* Hero */}
      <PageHero
        page="professionisti"
        defaultTitle="Professionisti"
        defaultImage={imgs.hero}
      />

      {/* Content */}
      <section className="section-padding">
        <div className="luxury-container max-w-4xl">
          <h2 className="font-serif text-3xl md:text-4xl text-warm-800 mb-8 text-center">
            Per architetti e <em>interior designer</em>
          </h2>

          <div className="space-y-6 text-sm text-warm-600 leading-relaxed">
            <p>
              Gebrüder Thonet Vienna collabora con architetti, interior designer e professionisti
              del settore contract per la realizzazione di progetti su misura. Il nostro team è a
              disposizione per offrire consulenze personalizzate, supporto tecnico e soluzioni
              progettuali dedicate.
            </p>
            <p>
              Offriamo un servizio completo che include: campionature materiali, personalizzazioni
              di finiture e tessuti, pianificazione delle forniture per il settore hospitality, ristorazione
              e spazi commerciali.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-8 border border-warm-200 rounded-lg">
              <h3 className="font-semibold text-warm-800 mb-3">Consulenza progettuale</h3>
              <p className="text-xs text-warm-500 leading-relaxed">
                Supporto dedicato nella scelta dei prodotti e delle finiture più adatte al progetto.
              </p>
            </div>
            <div className="text-center p-8 border border-warm-200 rounded-lg">
              <h3 className="font-semibold text-warm-800 mb-3">Personalizzazioni</h3>
              <p className="text-xs text-warm-500 leading-relaxed">
                Finiture, tessuti e configurazioni su misura per rispondere alle esigenze specifiche.
              </p>
            </div>
            <div className="text-center p-8 border border-warm-200 rounded-lg">
              <h3 className="font-semibold text-warm-800 mb-3">Contract</h3>
              <p className="text-xs text-warm-500 leading-relaxed">
                Forniture complete per hospitality, ristorazione e spazi commerciali.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link
              href="/contatti/richiesta-info"
              className="inline-block px-8 py-3 border border-warm-800 text-xs font-medium uppercase tracking-[0.2em] text-warm-800 hover:bg-warm-800 hover:text-white transition-all duration-300"
            >
              Richiedi informazioni
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
