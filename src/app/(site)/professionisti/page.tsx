import Image from "next/image";
import Link from "next/link";
import { getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";

const PAGES = [
  { page: "cataloghi", labelKey: "menu.professionals.catalogs", href: "/professionisti/cataloghi" },
  { page: "materiale-tecnico", labelKey: "menu.professionals.tech", href: "/professionisti/materiale-tecnico" },
  { page: "realizzazioni-custom", labelKey: "menu.professionals.custom", href: "/professionisti/realizzazioni-custom" },
];

export default async function ProfessionistiPage() {
  const cardImages = await getRelatedCardImages(PAGES.map((p) => p.page));
  const T = await tBatch([
    "professionisti.title",
    "professionisti.description",
    "professionisti.breadcrumb",
    "common.breadcrumb_home",
    ...PAGES.map((p) => p.labelKey),
  ]);

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            {T["professionisti.title"]}
          </h1>
        </div>
      </section>

      {/* ── Paragrafo intro — stile pagina Prodotti ──────────── */}
      <section className="pb-16 md:pb-20">
        <div className="gtv-container">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            {T["professionisti.description"]}
          </p>
        </div>
      </section>

      {/* ── Card delle pagine — stile "Potrebbe interessarti anche" ── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <div className="mx-auto" style={{ maxWidth: "73.5%" }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12">
              {PAGES.map((p) => {
                const coverSrc = cardImages[p.page] || null;
                const label = T[p.labelKey];
                return (
                  <Link key={p.page} href={p.href} className="group block">
                    <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-warm-200" />
                      )}
                    </div>
                    <h4 className="font-sans text-[22px] md:text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-4">
                      {label}
                    </h4>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs ──────────────────────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">{T["common.breadcrumb_home"]}</Link>
          <span>&gt;</span>
          <span>{T["professionisti.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
