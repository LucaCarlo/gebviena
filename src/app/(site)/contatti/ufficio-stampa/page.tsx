import Image from "next/image";
import Link from "next/link";

export default function UfficioStampaPage() {
  return (
    <>
      <section className="relative h-[35vh] flex items-center justify-center bg-warm-900">
        <Image src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop" alt="Ufficio Stampa" fill className="object-cover opacity-30" />
        <h1 className="relative font-serif text-3xl md:text-5xl text-white">Ufficio Stampa</h1>
      </section>

      <section className="section-padding">
        <div className="luxury-container max-w-3xl text-center">
          <p className="text-sm text-warm-600 leading-relaxed mb-12">
            Per richieste stampa, press kit, immagini in alta risoluzione e informazioni sui nostri
            prodotti e progetti, vi invitiamo a contattare il nostro ufficio stampa.
          </p>

          <div className="bg-brand-50 p-8 rounded-lg">
            <h2 className="font-semibold text-warm-800 mb-4">Contatto Ufficio Stampa</h2>
            <div className="space-y-2 text-sm text-warm-600">
              <p>Gebrüder Thonet Vienna GmbH</p>
              <p>Via Foggia 23/H – 10152 Torino (Italy)</p>
              <p>T. +39 0116133330</p>
              <p className="text-brand-500">press@gebruederthonetvienna.com</p>
            </div>
          </div>

          <div className="mt-12">
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
