import { prisma } from "@/lib/prisma";
import SvenditaTemplate from "@/components/landing/svendita/SvenditaTemplate";
import GenericLandingTemplate from "@/components/landing/generic/GenericLandingTemplate";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";

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

  const lang = getCurrentLang();
  const translation =
    lang !== DEFAULT_LANG
      ? await prisma.landingPageConfigTranslation.findUnique({
          where: { landingPageId_languageCode: { landingPageId: cfg.id, languageCode: lang } },
        })
      : null;

  if (cfg.template === "svendita") {
    // Applica override delle label dei form fields se la traduzione le ha
    let formFieldsForTemplate = cfg.formFields;
    if (translation?.formFieldLabels && cfg.formFields) {
      try {
        const labels = JSON.parse(translation.formFieldLabels) as Record<string, string>;
        const fields = JSON.parse(cfg.formFields) as Array<{ key: string; label: string } & Record<string, unknown>>;
        formFieldsForTemplate = JSON.stringify(
          fields.map((f) => (labels[f.key] ? { ...f, label: labels[f.key] } : f))
        );
      } catch { /* fallback su IT */ }
    }
    return (
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
    );
  }

  return (
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
  );
}
