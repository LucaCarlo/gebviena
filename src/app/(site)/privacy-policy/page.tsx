"use client";

import Script from "next/script";

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="luxury-container max-w-3xl">
        <div className="prose prose-sm text-warm-600">
          <a
            href="https://www.iubenda.com/privacy-policy/24997138"
            className="iubenda-white iubenda-noiframe iubenda-embed iub-legal-only iubenda-noiframe iub-body-embed"
            title="Privacy Policy"
          >
            Privacy Policy
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
