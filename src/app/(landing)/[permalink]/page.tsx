import { prisma } from "@/lib/prisma";
import Script from "next/script";
import SvenditaTemplate from "@/components/landing/svendita/SvenditaTemplate";
import GenericLandingTemplate from "@/components/landing/generic/GenericLandingTemplate";
import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";
import { pixelLandingParams } from "@/lib/pixel-params";

// Lingue ammesse sui template "svendita": qualunque altra lingua viene
// forzata a IT (sia rendering che switcher).
const SVENDITA_ALLOWED_LANGS = new Set(["it", "fr"]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: { permalink: string };
}

export default async function LandingDispatcher({ params }: PageProps) {
  const cfg = await prisma.landingPageConfig.findUnique({
    where: { permalink: params.permalink },
  });

  if (!cfg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-light text-warm-300 mb-4">404</h1>
          <p className="text-warm-500">Pagina non trovata</p>
        </div>
      </div>
    );
  }

  if (!cfg.isActive) {
    return (
      <div className="section-padding flex items-center justify-center">
        <p className="text-warm-400 text-lg font-light">
          This page is currently not available.
        </p>
      </div>
    );
  }

  const rawLang = getCurrentLang();
  // Sui template svendita lo store ammette solo IT/FR. Qualunque altra lingua
  // viene clampata a IT prima di caricare traduzioni / inviare al server.
  const lang = (cfg.template === "svendita" && !SVENDITA_ALLOWED_LANGS.has(rawLang))
    ? DEFAULT_LANG
    : rawLang;
  const translation =
    lang !== DEFAULT_LANG
      ? await prisma.landingPageConfigTranslation.findUnique({
          where: { landingPageId_languageCode: { landingPageId: cfg.id, languageCode: lang } },
        })
      : null;

  // Meta Pixel: evento custom LandingView con language/market/page_type
  const landingParams = pixelLandingParams(lang, cfg.template);
  const pixelScript = (
    <Script id={`fb-pixel-landing-view-${cfg.id}`} strategy="afterInteractive">
      {`if (typeof window !== "undefined" && typeof window.fbq === "function") { window.fbq("trackCustom", "LandingView", ${JSON.stringify(landingParams)}); }`}
    </Script>
  );

  if (cfg.template === "svendita") {
    // Applica override delle label e placeholder dei form fields se la traduzione li ha
    let formFieldsForTemplate = cfg.formFields;
    if ((translation?.formFieldLabels || translation?.formFieldPlaceholders) && cfg.formFields) {
      try {
        const labels = translation?.formFieldLabels ? JSON.parse(translation.formFieldLabels) as Record<string, string> : {};
        const placeholders = translation?.formFieldPlaceholders ? JSON.parse(translation.formFieldPlaceholders) as Record<string, string> : {};
        const fields = JSON.parse(cfg.formFields) as Array<{ key: string; label: string; placeholder?: string } & Record<string, unknown>>;
        formFieldsForTemplate = JSON.stringify(
          fields.map((f) => ({
            ...f,
            ...(labels[f.key] ? { label: labels[f.key] } : {}),
            ...(placeholders[f.key] ? { placeholder: placeholders[f.key] } : {}),
          }))
        );
      } catch { /* fallback su IT */ }
    }
    // Se la lingua è stata clampata (cookie != it/fr), ri-wrappa con un
    // I18nProvider interno così SvenditaTemplate e figli leggono "it",
    // ignorando quanto impostato dalla LandingLayout esterna.
    const langWasClamped = rawLang !== lang;
    const innerOverrides = langWasClamped ? await loadAllUiTranslations(lang) : null;
    const svenditaTree = (
      <>
        {pixelScript}
        <SvenditaTemplate
          row={{
            heroTitle: cfg.heroTitle,
            heroSubtitle: cfg.heroSubtitle,
            bannerImage: cfg.bannerImage,
            buttonLabel: cfg.buttonLabel,
            privacyLabel: cfg.privacyLabel,
            formFields: formFieldsForTemplate,
            customConfig: cfg.customConfig,
          }}
          translation={translation}
        />
      </>
    );
    return langWasClamped && innerOverrides
      ? <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={innerOverrides}>{svenditaTree}</I18nProvider>
      : svenditaTree;
  }

  return (
    <>
      {pixelScript}
      <GenericLandingTemplate
        config={{
          id: cfg.id,
          heroTitle: translation?.heroTitle || cfg.heroTitle,
          heroSubtitle: translation?.heroSubtitle ?? cfg.heroSubtitle,
          heroLocation: cfg.heroLocation,
          heroDescription: cfg.heroDescription,
          successTitle: translation?.successTitle || cfg.successTitle,
          successMessage: translation?.successMessage ?? cfg.successMessage,
          privacyLabel: translation?.privacyLabel || cfg.privacyLabel,
          marketingLabel: translation?.marketingLabel ?? cfg.marketingLabel,
          buttonLabel: translation?.buttonLabel || cfg.buttonLabel,
          bannerImage: cfg.bannerImage,
          logoImage: cfg.logoImage,
          formFields: cfg.formFields,
          isActive: cfg.isActive,
        }}
      />
    </>
  );
}
