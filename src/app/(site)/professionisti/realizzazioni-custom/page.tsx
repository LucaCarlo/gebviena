import Image from "next/image";
import Link from "next/link";
import { getPageImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";

const DEFAULTS: Record<string, string> = {
  main: "/images/professionisti-realizzazioni.webp",
};

export default async function RealizzazioniCustomPage() {
  const imgs = await getPageImages("realizzazioni-custom", DEFAULTS);
  const T = await tBatch([
    "realizzazioni-custom.title",
    "realizzazioni-custom.description",
    "realizzazioni-custom.cta",
    "realizzazioni-custom.breadcrumb",
    "common.breadcrumb_home",
    "nav.professionals",
  ]);

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            {T["realizzazioni-custom.title"]}
          </h1>
        </div>
      </section>

      {/* ── Sezione stile "Born in Vienna" — testo sx, immagine dx ── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: text */}
          <div className="flex flex-col justify-center px-6 py-12 lg:px-[150px] lg:py-24">
            <p className="text-[20px] text-black leading-snug font-light tracking-normal">
              {T["realizzazioni-custom.description"]}
            </p>
            <Link
              href="/contatti/richiesta-info"
              className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline"
              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
            >
              {T["realizzazioni-custom.cta"]}
            </Link>
          </div>

          {/* Right: image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs.main}
              alt="Realizzazioni Custom"
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
          <Link href="/professionisti">{T["nav.professionals"]}</Link>
          <span>&gt;</span>
          <span>{T["realizzazioni-custom.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
