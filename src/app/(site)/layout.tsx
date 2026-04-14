import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientMain from "@/components/layout/ClientMain";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getCurrentLang();
  const overrides = await loadAllUiTranslations(lang);

  return (
    <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={overrides}>
      <RecaptchaProvider>
        <div className="bg-white min-h-screen relative overflow-hidden" style={{ marginLeft: 'var(--site-margin)', marginRight: 'var(--site-margin)' }}>
          <Header />
          <ClientMain>{children}</ClientMain>
          <Footer />
        </div>
      </RecaptchaProvider>
    </I18nProvider>
  );
}
