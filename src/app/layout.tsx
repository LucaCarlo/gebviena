import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import Script from "next/script";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              "siteId": 4004725,
              "cookiePolicyId": 24997138,
              "lang": "it",
              "storage": { "useSiteId": true }
            };
          `}</Script>
        <Script src="https://cs.iubenda.com/autoblocking/4004725.js" strategy="afterInteractive" />
        <Script src="https://cdn.iubenda.com/cs/iubenda_cs.js" strategy="afterInteractive" charSet="UTF-8" />
      </body>
    </html>
  );
}
