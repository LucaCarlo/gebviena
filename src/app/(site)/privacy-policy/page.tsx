import Script from "next/script";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_COOKIE_POLICY_ID = "24997138";

async function getCookiePolicyId(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "iubenda_cookie_policy_id" } });
    return (row?.value || DEFAULT_COOKIE_POLICY_ID).trim();
  } catch {
    return DEFAULT_COOKIE_POLICY_ID;
  }
}

export default async function PrivacyPolicyPage() {
  const id = await getCookiePolicyId();
  return (
    <div className="pt-32 pb-20">
      <div className="luxury-container max-w-5xl">
        <div className="prose prose-base text-warm-700 max-w-none">
          <a
            href={`https://www.iubenda.com/privacy-policy/${id}`}
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
