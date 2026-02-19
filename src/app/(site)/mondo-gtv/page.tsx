import Image from "next/image";
import Link from "next/link";

export default function MondoGTVPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] flex items-center justify-center bg-warm-900">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=800&fit=crop"
          alt="Mondo GTV"
          fill
          className="object-cover opacity-30"
        />
        <h1 className="relative font-serif text-4xl md:text-6xl text-white text-center">
          Mondo GTV
        </h1>
      </section>

      {/* Intro */}
      <section className="section-padding">
        <div className="luxury-container max-w-4xl text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-warm-800 mb-8">
            La tradizione che <em>ispira</em> il futuro
          </h2>
          <p className="text-sm text-warm-600 leading-relaxed">
            Gebrüder Thonet Vienna GmbH è un&apos;azienda che nasce dalla tradizione del legno curvato,
            un&apos;arte che affonda le radici nella Vienna del XIX secolo. Oggi, con sede a Torino, GTV
            reinterpreta questo patrimonio con uno sguardo rivolto al design contemporaneo,
            collaborando con i più importanti studi di progettazione internazionali.
          </p>
        </div>
      </section>

      {/* Heritage Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&h=1080&fit=crop"
          alt="Heritage"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="font-serif text-3xl md:text-5xl text-white text-center leading-tight">
            Born in Vienna.<br />
            Made in Italy.<br />
            Designed around the world.
          </h2>
        </div>
      </section>

      {/* Wood Craftsmanship */}
      <section className="section-padding">
        <div className="luxury-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-text mb-4">La lavorazione</p>
              <h2 className="font-serif text-3xl md:text-4xl text-warm-800 mb-6">
                L&apos;arte del legno curvato
              </h2>
              <p className="text-sm text-warm-600 leading-relaxed mb-4">
                La curvatura del legno massello è una tecnica unica che permette di modellare il faggio
                attraverso il vapore, creando forme eleganti e resistenti senza l&apos;uso di giunture.
                Questo processo, perfezionato nel corso di oltre 150 anni, è il cuore della produzione GTV.
              </p>
              <p className="text-sm text-warm-600 leading-relaxed">
                Ogni pezzo viene realizzato da artigiani esperti che combinano la sapienza manuale
                con tecnologie all&apos;avanguardia, garantendo qualità e durabilità in ogni dettaglio.
              </p>
            </div>
            <div className="aspect-[4/5] relative">
              <Image
                src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=1000&fit=crop"
                alt="Lavorazione del legno"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Designers */}
      <section className="section-padding bg-brand-50">
        <div className="luxury-container text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-warm-800 mb-6">
            I nostri <em>designer</em>
          </h2>
          <p className="text-sm text-warm-600 leading-relaxed max-w-2xl mx-auto mb-12">
            Collaboriamo con i più rinomati designer e studi di architettura del mondo
            per creare pezzi che combinano innovazione e tradizione.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {["GamFratesi", "Front", "Studio Irvine", "Chiara Andreatti", "Luca Nichetto", "Nigel Coates", "Martino Gamper", "LucidiPevere"].map((name) => (
              <div key={name} className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-warm-200 mb-3" />
                <p className="text-sm font-medium text-warm-800">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding text-center">
        <div className="luxury-container">
          <h2 className="font-serif text-3xl md:text-4xl text-warm-800 mb-6">
            Scopri la collezione
          </h2>
          <Link
            href="/prodotti"
            className="inline-block px-8 py-3 border border-warm-800 text-xs font-medium uppercase tracking-[0.2em] text-warm-800 hover:bg-warm-800 hover:text-white transition-all duration-300"
          >
            Vedi tutti i prodotti
          </Link>
        </div>
      </section>
    </>
  );
}
