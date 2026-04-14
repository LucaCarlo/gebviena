import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientMain from "@/components/layout/ClientMain";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";
import { headers } from "next/headers";
import { buildAlternates } from "@/lib/seo-alternates";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  // Reconstruct the canonical IT path from the rewritten URL set by middleware
  // (middleware strips lang prefix and translates segments back to IT before page renders)
  const h = headers();
  const itPath = h.get("x-gtv-canonical-path") || "/";
  const alternates = await buildAlternates(itPath);
  return { alternates };
}

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
