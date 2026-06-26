import type { Metadata } from "next";
import {
  Work_Sans, Libre_Caslon_Text,
  Inter, Playfair_Display, Lora, Montserrat, Roboto, Poppins,
} from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import "./globals.css";

// Pesi 300..700 servono all'editor delle news per scegliere il peso del testo.
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Libre Caslon Text: pesi disponibili 400 e 700, con varianti italic.
const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  variable: "--font-caslon",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Font extra esposti come CSS variables per il font picker nello Style
// panel delle news (step 6). Sono caricati in CSS sempre, ma i woff2 si
// scaricano solo quando un blocco li usa effettivamente.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", weight: ["400", "500", "700"], display: "swap" });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400", "500", "600", "700"], display: "swap" });

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

async function loadFbPixelId(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "store.fb_pixel_id" } });
    const v = (row?.value || "").trim();
    // Se non configurato, mantiene il pixel storico (nessuna regressione di tracciamento).
    return v || META_PIXEL_ID;
  } catch {
    return META_PIXEL_ID;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iub = await loadIubendaConfig();
  const gtmId = await loadGtmId();
  const fbPixelId = await loadFbPixelId();
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
        {fbPixelId && (
          // beforeInteractive: lo stub window.fbq deve esistere prima che i componenti
          // client (es. ProductDetail) eseguano i loro useEffect e chiamino fbTrack().
          // Con afterInteractive ViewContent / AddToCart / AddToWishlist si perdevano.
          <Script id="meta-pixel" strategy="beforeInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `}</Script>
        )}
        {fbPixelId && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
      </head>
      <body className={`${workSans.variable} ${caslon.variable} ${inter.variable} ${playfair.variable} ${lora.variable} ${montserrat.variable} ${roboto.variable} ${poppins.variable} antialiased bg-white`}>
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
