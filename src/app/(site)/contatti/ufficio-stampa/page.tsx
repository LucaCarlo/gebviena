import Image from "next/image";
import Link from "next/link";
import { getPageImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";

const DEFAULTS: Record<string, string> = {
  main: "/images/PEERS-design-by-Front-for-GTV-2-1024x768.jpg",
};

export default async function UfficioStampaPage() {
  const imgs = await getPageImages("ufficio-stampa", DEFAULTS);
  const T = await tBatch([
    "ufficio-stampa.title",
    "ufficio-stampa.intro",
    "ufficio-stampa.agency",
    "ufficio-stampa.contact1.name",
    "ufficio-stampa.contact2.name",
    "ufficio-stampa.breadcrumb",
    "common.breadcrumb_home",
    "nav.contact",
  ]);

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            {T["ufficio-stampa.title"]}
          </h1>
        </div>
      </section>

      {/* ── Sezione stile "Born in Vienna" — testo sx, immagine dx ── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: text */}
          <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal">
              {T["ufficio-stampa.intro"]}
            </p>
            <p className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-8">
              {T["ufficio-stampa.agency"]}
            </p>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-6">
              {T["ufficio-stampa.contact1.name"]}{" "}
              <a
                href="mailto:debora@agencemelchior.com"
                className="underline underline-offset-4 hover:text-warm-600"
                style={{ textDecorationThickness: "0.5px" }}
              >
                debora@agencemelchior.com
              </a>
            </p>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-2">
              {T["ufficio-stampa.contact2.name"]}{" "}
              <a
                href="mailto:allegra@agencemelchior.com"
                className="underline underline-offset-4 hover:text-warm-600"
                style={{ textDecorationThickness: "0.5px" }}
              >
                allegra@agencemelchior.com
              </a>
            </p>
          </div>

          {/* Right: image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs.main}
              alt="Ufficio Stampa"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">{T["common.breadcrumb_home"]}</Link>
          <span>&gt;</span>
          <Link href="/contatti">{T["nav.contact"]}</Link>
          <span>&gt;</span>
          <span>{T["ufficio-stampa.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
