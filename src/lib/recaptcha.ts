import { prisma } from "@/lib/prisma";

interface RecaptchaConfig {
  enabled: boolean;
  siteKey: string;
  apiKey: string;
  projectId: string;
  scoreThreshold: number;
}

async function getRecaptchaConfig(): Promise<RecaptchaConfig> {
  const settings = await prisma.setting.findMany({ where: { group: "recaptcha" } });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  return {
    enabled: config.recaptcha_enabled === "true",
    siteKey: config.recaptcha_site_key || "",
    apiKey: config.recaptcha_api_key || "",
    projectId: config.recaptcha_project_id || "",
    scoreThreshold: parseFloat(config.recaptcha_score_threshold || "0.5"),
  };
}

export async function verifyRecaptcha(token: string, expectedAction?: string): Promise<boolean> {
  const cfg = await getRecaptchaConfig();

  // Skip if not enabled or not configured
  if (!cfg.enabled || !cfg.apiKey || !cfg.projectId || !cfg.siteKey) {
    return true;
  }

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${cfg.projectId}/assessments?key=${cfg.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: {
          token,
          siteKey: cfg.siteKey,
          expectedAction: expectedAction || undefined,
        },
      }),
    });

    const data = await res.json();

    if (!data.tokenProperties?.valid) {
      console.warn("reCAPTCHA Enterprise: invalid token", data.tokenProperties?.invalidReason);
      return false;
    }

    const score = data.riskAnalysis?.score ?? 0;
    return score >= cfg.scoreThreshold;
  } catch (e) {
    console.error("reCAPTCHA Enterprise verification error:", e);
    return true; // allow on error to not block users
  }
}
