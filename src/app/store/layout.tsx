import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";
import StoreHeader from "@/components/store/StoreHeader";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

export const metadata: Metadata = {
  title: "Store — Gebrüder Thonet Vienna",
  description: "Acquista online sedute, tavoli e complementi Gebrüder Thonet Vienna.",
};

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const lang = getCurrentLang();
  const overrides = await loadAllUiTranslations(lang);
  return (
    <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={overrides}>
      <RecaptchaProvider>
        <CustomerAuthProvider>
          <div
            className="bg-white min-h-screen relative overflow-hidden"
            style={{ marginLeft: "var(--site-margin)", marginRight: "var(--site-margin)" }}
          >
            <StoreHeader />
            <main className="pt-20 md:pt-24">{children}</main>
            <Footer />
          </div>
        </CustomerAuthProvider>
      </RecaptchaProvider>
    </I18nProvider>
  );
}
