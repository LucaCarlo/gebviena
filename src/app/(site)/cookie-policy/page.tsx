"use client";

import Script from "next/script";

export default function CookiePolicyPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="luxury-container max-w-3xl">
        <h1 className="font-serif text-3xl md:text-4xl text-warm-800 mb-8">Cookie Policy</h1>
        <div className="prose prose-sm text-warm-600">
          <a
            href="https://www.iubenda.com/privacy-policy/24997138/cookie-policy"
            className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe iub-body-embed"
            title="Cookie Policy"
          >
            Cookie Policy
          </a>
        </div>
      </div>
      <Script
        src="https://cdn.iubenda.com/iubenda.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
