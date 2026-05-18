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

  // Skip if not enabled or not configured (fail-open: non blocca)
  if (!cfg.enabled || !cfg.apiKey || !cfg.projectId || !cfg.siteKey) {
    return true;
  }

  // Token assente = richiesta NON da browser reale (bot/script che postano
  // direttamente all'API). Gli utenti veri ottengono sempre un token dal
  // provider. Blocco netto, senza nemmeno chiamare Google.
  if (!token || !token.trim()) {
    console.warn("[recaptcha] token mancante → bloccato (probabile bot)");
    return false;
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

    // Errore HTTP dell'API (es. API key con restrizione referrer, progetto
    // sbagliato, API non abilitata, billing): NON deve bloccare gli utenti
    // reali — fail-open. Logghiamo per diagnosi.
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[recaptcha] API HTTP ${res.status}:`, t.slice(0, 300));
      return true;
    }

    const data = await res.json();

    // Risposta non interpretabile (manca tokenProperties): fail-open.
    if (!data || typeof data.tokenProperties === "undefined") {
      console.error("[recaptcha] risposta inattesa:", JSON.stringify(data).slice(0, 300));
      return true;
    }

    if (!data.tokenProperties.valid) {
      console.warn("[recaptcha] token non valido:", data.tokenProperties.invalidReason);
      return false;
    }

    const score = data.riskAnalysis?.score ?? 0;
    return score >= cfg.scoreThreshold;
  } catch (e) {
    console.error("[recaptcha] errore verifica:", e);
    return true; // allow on error to not block users
  }
}
