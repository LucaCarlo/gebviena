import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getCurrentLang();
  const overrides = await loadAllUiTranslations(lang);

  return (
    <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={overrides}>
      <div className="bg-white min-h-screen">
        {children}
      </div>
    </I18nProvider>
  );
}
