import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import Link from "next/link";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";
import { pixelRegistrationParams } from "@/lib/pixel-params";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: { permalink: string };
}

/**
 * Thank-you page mostrata dopo la submit del form della landing /[permalink].
 *
 * URL: /<permalink>/grazie  (un permalink dedicato per ogni landing → permette
 * di tracciare la conversione in Meta Events Manager come pageview di questa URL).
 *
 * Su questa pagina viene anche tracciato l'evento Meta Pixel `CompleteRegistration`
 * (oltre al PageView che parte dal root layout). NON va messo nel root layout
 * perchè conterebbe ogni pageview come registrazione.
 */
export default async function LandingThankYouPage({ params }: PageProps) {
  const cfg = await prisma.landingPageConfig.findUnique({
    where: { permalink: params.permalink },
  });

  if (!cfg) notFound();

  const lang = getCurrentLang();
  const translation =
    lang !== DEFAULT_LANG
      ? await prisma.landingPageConfigTranslation.findUnique({
          where: { landingPageId_languageCode: { landingPageId: cfg.id, languageCode: lang } },
        })
      : null;

  // successCardTitle / successCardMessage sono colonne dirette su LandingPageConfig
  // e sulla relativa Translation. La translation (se in lingua) ha precedenza.
  // Sui template "svendita" i valori vivono dentro customConfig (JSON) → fallback su quello.
  let baseTitle: string | null = null;
  let baseMessage: string | null = null;
  if (cfg.customConfig) {
    try {
      const parsed = JSON.parse(cfg.customConfig) as { successCardTitle?: string; successCardMessage?: string };
      baseTitle = parsed.successCardTitle || null;
      baseMessage = parsed.successCardMessage || null;
    } catch { /* ignore */ }
  }

  const title = translation?.successCardTitle || baseTitle || "Richiesta inviata";
  const message =
    translation?.successCardMessage
    || baseMessage
    || "Ti abbiamo inviato un'email di conferma all'indirizzo che ci hai fornito. A breve riceverai le istruzioni per accedere alla vendita speciale online.";

  const heroTitle = translation?.heroTitle || cfg.heroTitle || "Grazie";
  const bannerImage = cfg.bannerImage;

  const registrationParams = pixelRegistrationParams(lang, cfg.template);

  return (
    <>
      {/* Meta Pixel — evento CompleteRegistration con parametri di segmentazione
          (language, country_market, registration_type). Pixel base PageView resta
          attivo dal root layout. */}
      <Script id={`fb-pixel-complete-registration-${cfg.id}`} strategy="afterInteractive">
        {`if (typeof window !== "undefined" && typeof window.fbq === "function") { window.fbq("track", "CompleteRegistration", ${JSON.stringify(registrationParams)}); }`}
      </Script>

      <div className="min-h-[80vh] bg-white">
        {bannerImage && (
          <div className="relative w-full h-[280px] md:h-[380px] bg-warm-100">
            <Image src={bannerImage} alt={heroTitle} fill priority className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <section className="px-6 md:px-10 py-16 md:py-24 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-7">
            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={1.6} />
          </div>
          <h1 className="text-[34px] md:text-[44px] font-semibold leading-[1.08] text-dark mb-5 tracking-[-0.01em]">
            {title}
          </h1>
          <p className="text-[15px] md:text-[16px] text-warm-700 leading-[1.65] whitespace-pre-line mb-10">
            {message}
          </p>

          <Link
            href="/"
            className="inline-block bg-dark text-white px-8 py-3 text-[13px] font-semibold uppercase tracking-[0.18em] hover:opacity-85 transition-opacity"
          >
            Torna alla home
          </Link>
        </section>
      </div>
    </>
  );
}
