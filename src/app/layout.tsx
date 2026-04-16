import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import Script from "next/script";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wiener GTV Design | Gebrüder Thonet Vienna",
  description:
    "Born in Vienna. Made in Italy. Designed around the world. Scopri la collezione di arredi di design Gebrüder Thonet Vienna.",
};

const DEFAULT_IUBENDA_SITE_ID = "4004725";
const DEFAULT_IUBENDA_COOKIE_POLICY_ID = "24997138";

async function loadIubendaConfig() {
  try {
    const rows = await prisma.setting.findMany({ where: { group: "iubenda" } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      siteId: (map.get("iubenda_site_id") || DEFAULT_IUBENDA_SITE_ID).trim(),
      cookiePolicyId: (map.get("iubenda_cookie_policy_id") || DEFAULT_IUBENDA_COOKIE_POLICY_ID).trim(),
    };
  } catch {
    return { siteId: DEFAULT_IUBENDA_SITE_ID, cookiePolicyId: DEFAULT_IUBENDA_COOKIE_POLICY_ID };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iub = await loadIubendaConfig();
  return (
    <html lang="it">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${workSans.variable} antialiased bg-white`}>
        {children}
        <Script id="iubenda-config" strategy="afterInteractive">{`
            var _iub = _iub || [];
            _iub.csConfiguration = {
              "siteId": ${Number(iub.siteId) || 0},
              "cookiePolicyId": ${Number(iub.cookiePolicyId) || 0},
              "lang": "it",
              "storage": { "useSiteId": true }
            };
          `}</Script>
        <Script src={`https://cs.iubenda.com/autoblocking/${iub.siteId}.js`} strategy="afterInteractive" />
        <Script src="https://cdn.iubenda.com/cs/iubenda_cs.js" strategy="afterInteractive" charSet="UTF-8" />
      </body>
    </html>
  );
}
