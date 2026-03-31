import Link from "next/link";
import { MapPin, Users, Newspaper, Mail, QrCode } from "lucide-react";
import { getPageImages } from "@/lib/page-images";
import PageHero from "@/components/PageHero";

const contactLinks = [
  {
    icon: MapPin,
    title: "Rete di vendita",
    description: "Trova il punto vendita o agente più vicino a te.",
    href: "/contatti/rete-vendita",
  },
  {
    icon: Users,
    title: "Collaborazioni nuovi designer",
    description: "Invia la tua candidatura per collaborare con GTV.",
    href: "/contatti/collaborazioni",
  },
  {
    icon: Newspaper,
    title: "Ufficio stampa",
    description: "Materiali stampa, press kit e contatti per i media.",
    href: "/contatti/ufficio-stampa",
  },
  {
    icon: Mail,
    title: "Richiesta informazioni",
    description: "Per qualsiasi altra informazione, scrivici.",
    href: "/contatti/richiesta-info",
  },
  {
    icon: QrCode,
    title: "Landing Page",
    description: "Registrati per ricevere il tuo QR code personale per l'evento.",
    href: "/evento-mdw-2026",
  },
];

const DEFAULTS: Record<string, string> = {
  hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop",
};

export default async function ContattiPage() {
  const imgs = await getPageImages("contatti", DEFAULTS);

  return (
    <>
      {/* Hero */}
      <PageHero
        page="contatti"
        defaultTitle="Contatti"
        defaultImage={imgs.hero}
      />

      {/* Contact Cards */}
      <section className="section-padding">
        <div className="luxury-container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group p-8 border border-warm-200 rounded-lg hover:border-warm-400 hover:shadow-md transition-all"
              >
                <item.icon
                  size={28}
                  className="text-warm-400 group-hover:text-warm-800 transition-colors mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="text-lg font-semibold text-warm-800 mb-2">{item.title}</h3>
                <p className="text-sm text-warm-500">{item.description}</p>
                <span className="inline-block mt-4 text-xs font-medium uppercase tracking-[0.2em] text-warm-400 group-hover:text-warm-800 transition-colors">
                  Scopri →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="section-padding bg-brand-50">
        <div className="luxury-container max-w-4xl text-center">
          <h2 className="font-serif text-2xl text-warm-800 mb-8">Sede principale</h2>
          <div className="space-y-2 text-sm text-warm-600">
            <p className="font-semibold text-warm-800">Headquarters Gebrüder Thonet Vienna GmbH</p>
            <p>Via Foggia 23/H – 10152 Torino (Italy)</p>
            <p>T. +39 0116133330</p>
          </div>
        </div>
      </section>
    </>
  );
}
