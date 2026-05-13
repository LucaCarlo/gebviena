/**
 * Helper per parametri Meta Pixel custom (LandingView / CompleteRegistration).
 * Mappa il codice lingua corrente al mercato per la segmentazione audience.
 */

const COUNTRY_MARKET_BY_LANG: Record<string, string> = {
  it: "italy",
  fr: "france",
  de: "germany",
  es: "spain",
  en: "international",
};

export function pixelLandingParams(lang: string, template?: string | null) {
  return {
    language: lang || "it",
    country_market: COUNTRY_MARKET_BY_LANG[lang] || "international",
    page_type: template === "svendita" ? "sale_registration_landing" : "generic_landing",
  };
}

export function pixelRegistrationParams(lang: string, template?: string | null) {
  return {
    language: lang || "it",
    country_market: COUNTRY_MARKET_BY_LANG[lang] || "international",
    registration_type:
      template === "svendita" ? "private_sale_access" : "generic_landing_registration",
  };
}
