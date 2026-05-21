import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import StoreFooter from "@/components/store/StoreFooter";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { getCurrentLang, loadAllUiTranslations, DEFAULT_LANG } from "@/lib/i18n";
import StoreHeader from "@/components/store/StoreHeader";
import PendingOrdersBanner from "@/components/store/PendingOrdersBanner";
import MaintenanceScreen from "@/components/store/MaintenanceScreen";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Store — Gebrüder Thonet Vienna",
  description: "Acquista online sedute, tavoli e complementi Gebrüder Thonet Vienna.",
};

// Always re-evaluate maintenance flag; admins flip it from /admin/store/settings.
export const dynamic = "force-dynamic";

function getMainSiteUrl(): string {
  const h = headers();
  const host = (h.get("host") || "gebruederthonetvienna.com").toLowerCase();
  const proto = h.get("x-forwarded-proto") || "https";
  const mainHost = host.startsWith("store.") ? host.slice("store.".length) : host;
  return `${proto}://${mainHost}`;
}

async function loadMaintenanceConfig() {
  noStore();
  try {
    const rows = await prisma.setting.findMany({ where: { group: "store_maintenance" } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      enabled: map.get("store.maintenance.enabled") === "true",
      title: map.get("store.maintenance.title") || "",
      message: map.get("store.maintenance.message") || "",
      openingDate: map.get("store.maintenance.opening_date") || "",
    };
  } catch {
    return { enabled: false, title: "", message: "", openingDate: "" };
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const lang = getCurrentLang();
  const [overrides, maintenance] = await Promise.all([
    loadAllUiTranslations(lang),
    loadMaintenanceConfig(),
  ]);

  // Maintenance / coming-soon mode: bypass the entire store UI and show a static screen.
  // Admin (/admin/*) is on a different layout, so it remains accessible.
  if (maintenance.enabled) {
    return (
      <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={overrides}>
        <MaintenanceScreen
          title={maintenance.title}
          message={maintenance.message}
          openingDate={maintenance.openingDate || null}
          mainSiteUrl={getMainSiteUrl()}
          lang={lang}
        />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider lang={lang} defaultLang={DEFAULT_LANG} overrides={overrides}>
      <RecaptchaProvider>
        <CustomerAuthProvider>
          <CartProvider>
          <div
            className="bg-white min-h-screen relative overflow-hidden"
            style={{ marginLeft: "var(--site-margin)", marginRight: "var(--site-margin)" }}
          >
            <Suspense fallback={<div className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-white border-b border-neutral-100 z-50" />}>
              <StoreHeader />
            </Suspense>
            <PendingOrdersBanner />
            <main className="pt-20 md:pt-24">{children}</main>
            <StoreFooter />
          </div>
        </CartProvider>
        </CustomerAuthProvider>
      </RecaptchaProvider>
    </I18nProvider>
  );
}
