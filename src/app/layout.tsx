import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
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
const META_PIXEL_ID = "1358148166154402";

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

async function loadGtmId(): Promise<string> {
  try {
    const host = (headers().get("host") || "").toLowerCase();
    const isStore = host.startsWith("store.");
    const rows = await prisma.setting.findMany({ where: { group: "analytics" } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return ((isStore ? map.get("gtm_store_id") : map.get("gtm_site_id")) || "").trim();
  } catch {
    return "";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iub = await loadIubendaConfig();
  const gtmId = await loadGtmId();
  return (
    <html lang="it">
      <head>
        {gtmId && (
          <Script id="gtm-loader" strategy="afterInteractive">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}</Script>
        )}
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}</Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </head>
      <body className={`${workSans.variable} antialiased bg-white`}>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0" width="0" style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        )}
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
