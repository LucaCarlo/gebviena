/**
 * Tariffe di spedizione — versione dinamica (modificabili dall'admin via DB).
 *
 * I valori vivono in DB su due sorgenti:
 *  - Setting (group="shipping") per i valori globali (soglia free shipping,
 *    fallback IT, tariffe FR, consegna al piano, disimballo, RoW per scatola).
 *  - ShippingRegionRate per le 20 tariffe flat per regione italiana.
 *
 * Geografia (mapping provincia→regione e CAP-prefix→regione) resta nel codice
 * perché non cambia mai. Cambiano solo i prezzi.
 *
 * Cache in-memory 30s per non interrogare il DB ad ogni quote.
 *
 * Comportamento di sicurezza: se per qualsiasi motivo il DB non risponde o un
 * valore è mancante, si fa fallback al DEFAULT hardcoded — che è IDENTICO ai
 * valori attivi prima dell'introduzione del sistema dinamico. Quindi prima del
 * primo salvataggio dall'admin, il sito gira esattamente come prima.
 *
 * IT:  tariffa FLAT per regione. Lookup primario via codice provincia
 *      (es. "MI" → Lombardia). Fallback: prefisso CAP 2 cifre.
 *      Se nessuno match, fallback alla tariffa configurata (default 162€).
 * FR:  per m³. 186€/m³ standard; 300€/m³ se CAP inizia con "20" (Corsica).
 * Altri paesi: fallback flat per scatola (default 90€/scatola).
 *
 * Volume fatturabile: il m³ è un'unità fissa e indivisibile.
 *   billableVol = max(1, ceil(volReale)).
 *
 * Soglia spedizione gratuita: configurabile (default 950€); azzera SOLO la
 * quota standard. Servizi aggiuntivi (piano, disimballo) restano fatturati.
 */

import { prisma } from "./prisma";

// ─── Defaults (= valori in produzione prima del passaggio a DB) ─────────
const DEFAULT_REGION_RATES: Record<string, number> = {
  LOMBARDIA: 7000,
  PIEMONTE: 8200,
  "VALLE D'AOSTA": 9200,
  VENETO: 8200,
  "FRIULI-VENEZIA GIULIA": 8800,
  "TRENTINO-ALTO ADIGE": 8800,
  "EMILIA-ROMAGNA": 8200,
  LIGURIA: 8800,
  TOSCANA: 9400,
  UMBRIA: 9900,
  MARCHE: 9400,
  MOLISE: 12200,
  ABRUZZO: 11000,
  BASILICATA: 14300,
  LAZIO: 10300,
  CALABRIA: 14300,
  CAMPANIA: 12000,
  PUGLIA: 12000,
  SICILIA: 16200,
  SARDEGNA: 16200,
};

const DEFAULTS = {
  freeThresholdCents: 95000,         // 950 EUR
  itFallbackCents: 16200,            // 162 EUR
  frStandardPerM3Cents: 18600,       // 186 EUR/m³ (default Francia)
  unboxingPerM3Cents: 2000,          // 20 EUR/m³
  rowPerBoxCents: 9000,              // 90 EUR/scatola (resto del mondo)
};
// Tariffa di consegna al piano per paese. La chiave "ROW" funge da fallback
// per qualsiasi paese non esplicitamente listato. Quando viene caricata una
// nuova nazione via admin, la sua chiave (es. "DE") va aggiunta qui per il
// default e diventa modificabile dalla pagina Spedizioni.
const DEFAULT_FLOOR_DELIVERY: Record<string, number> = {
  IT: 12000,   // 120 EUR/m³
  FR: 14000,   // 140 EUR/m³
  ROW: 12000,  // 120 EUR/m³ (fallback per tutti gli altri paesi)
};
// NOTE: il vecchio fallback Corse (300€/m³) è ora un override esplicito sulla
// régione "94" Corse in ShippingRegionRate. Vedi computeShipping FR sotto.

// Ordine canonico di visualizzazione per le regioni IT (geografico nord→sud).
export const REGION_ORDER: { code: string; label: string }[] = [
  { code: "LOMBARDIA", label: "Lombardia" },
  { code: "PIEMONTE", label: "Piemonte" },
  { code: "VALLE D'AOSTA", label: "Valle d'Aosta" },
  { code: "VENETO", label: "Veneto" },
  { code: "FRIULI-VENEZIA GIULIA", label: "Friuli-Venezia Giulia" },
  { code: "TRENTINO-ALTO ADIGE", label: "Trentino-Alto Adige" },
  { code: "EMILIA-ROMAGNA", label: "Emilia-Romagna" },
  { code: "LIGURIA", label: "Liguria" },
  { code: "TOSCANA", label: "Toscana" },
  { code: "UMBRIA", label: "Umbria" },
  { code: "MARCHE", label: "Marche" },
  { code: "LAZIO", label: "Lazio" },
  { code: "ABRUZZO", label: "Abruzzo" },
  { code: "MOLISE", label: "Molise" },
  { code: "CAMPANIA", label: "Campania" },
  { code: "BASILICATA", label: "Basilicata" },
  { code: "PUGLIA", label: "Puglia" },
  { code: "CALABRIA", label: "Calabria" },
  { code: "SICILIA", label: "Sicilia" },
  { code: "SARDEGNA", label: "Sardegna" },
];

// Régions FR (codici INSEE) — i 18 totali. Default = null = usa fallback FR (186 / 300 Corsica).
export const FR_REGION_ORDER: { code: string; label: string }[] = [
  { code: "11", label: "Île-de-France" },
  { code: "24", label: "Centre-Val de Loire" },
  { code: "27", label: "Bourgogne-Franche-Comté" },
  { code: "28", label: "Normandie" },
  { code: "32", label: "Hauts-de-France" },
  { code: "44", label: "Grand Est" },
  { code: "52", label: "Pays de la Loire" },
  { code: "53", label: "Bretagne" },
  { code: "75", label: "Nouvelle-Aquitaine" },
  { code: "76", label: "Occitanie" },
  { code: "84", label: "Auvergne-Rhône-Alpes" },
  { code: "93", label: "Provence-Alpes-Côte d'Azur" },
  { code: "94", label: "Corse" },
  { code: "01", label: "Guadeloupe" },
  { code: "02", label: "Martinique" },
  { code: "03", label: "Guyane" },
  { code: "04", label: "La Réunion" },
  { code: "06", label: "Mayotte" },
];

// ─── Geografia (FISSA, non cambia) ─────────────────────────────────────
// Mapping codice provincia ISO 3166-2:IT → regione (107 province post-2015).
const PROVINCE_TO_REGION: Record<string, string> = {
  // ABRUZZO
  AQ: "ABRUZZO", CH: "ABRUZZO", PE: "ABRUZZO", TE: "ABRUZZO",
  // BASILICATA
  MT: "BASILICATA", PZ: "BASILICATA",
  // CALABRIA
  CS: "CALABRIA", CZ: "CALABRIA", KR: "CALABRIA", RC: "CALABRIA", VV: "CALABRIA",
  // CAMPANIA
  AV: "CAMPANIA", BN: "CAMPANIA", CE: "CAMPANIA", NA: "CAMPANIA", SA: "CAMPANIA",
  // EMILIA-ROMAGNA
  BO: "EMILIA-ROMAGNA", FC: "EMILIA-ROMAGNA", FE: "EMILIA-ROMAGNA",
  MO: "EMILIA-ROMAGNA", PC: "EMILIA-ROMAGNA", PR: "EMILIA-ROMAGNA",
  RA: "EMILIA-ROMAGNA", RE: "EMILIA-ROMAGNA", RN: "EMILIA-ROMAGNA",
  // FRIULI-VENEZIA GIULIA
  GO: "FRIULI-VENEZIA GIULIA", PN: "FRIULI-VENEZIA GIULIA",
  TS: "FRIULI-VENEZIA GIULIA", UD: "FRIULI-VENEZIA GIULIA",
  // LAZIO
  FR: "LAZIO", LT: "LAZIO", RI: "LAZIO", RM: "LAZIO", VT: "LAZIO",
  // LIGURIA
  GE: "LIGURIA", IM: "LIGURIA", SP: "LIGURIA", SV: "LIGURIA",
  // LOMBARDIA
  BG: "LOMBARDIA", BS: "LOMBARDIA", CO: "LOMBARDIA", CR: "LOMBARDIA",
  LC: "LOMBARDIA", LO: "LOMBARDIA", MB: "LOMBARDIA", MI: "LOMBARDIA",
  MN: "LOMBARDIA", PV: "LOMBARDIA", SO: "LOMBARDIA", VA: "LOMBARDIA",
  // MARCHE
  AN: "MARCHE", AP: "MARCHE", FM: "MARCHE", MC: "MARCHE", PU: "MARCHE",
  // MOLISE
  CB: "MOLISE", IS: "MOLISE",
  // PIEMONTE
  AL: "PIEMONTE", AT: "PIEMONTE", BI: "PIEMONTE", CN: "PIEMONTE",
  NO: "PIEMONTE", TO: "PIEMONTE", VB: "PIEMONTE", VC: "PIEMONTE",
  // PUGLIA — sia BT (ISO) che BAT (codice alternativo)
  BA: "PUGLIA", BT: "PUGLIA", BAT: "PUGLIA", BR: "PUGLIA",
  FG: "PUGLIA", LE: "PUGLIA", TA: "PUGLIA",
  // SARDEGNA — SU = Sud Sardegna
  CA: "SARDEGNA", NU: "SARDEGNA", OR: "SARDEGNA", SS: "SARDEGNA", SU: "SARDEGNA",
  // SICILIA
  AG: "SICILIA", CL: "SICILIA", CT: "SICILIA", EN: "SICILIA", ME: "SICILIA",
  PA: "SICILIA", RG: "SICILIA", SR: "SICILIA", TP: "SICILIA",
  // TOSCANA
  AR: "TOSCANA", FI: "TOSCANA", GR: "TOSCANA", LI: "TOSCANA", LU: "TOSCANA",
  MS: "TOSCANA", PI: "TOSCANA", PO: "TOSCANA", PT: "TOSCANA", SI: "TOSCANA",
  // TRENTINO-ALTO ADIGE
  BZ: "TRENTINO-ALTO ADIGE", TN: "TRENTINO-ALTO ADIGE",
  // UMBRIA
  PG: "UMBRIA", TR: "UMBRIA",
  // VALLE D'AOSTA
  AO: "VALLE D'AOSTA",
  // VENETO
  BL: "VENETO", PD: "VENETO", RO: "VENETO", TV: "VENETO",
  VE: "VENETO", VI: "VENETO", VR: "VENETO",
};

// CAP-prefix → regione (fallback geografico, non dipende dai prezzi).
const CAP_PREFIX_TO_REGION: Record<string, string> = {
  "00": "LAZIO", "01": "LAZIO", "02": "LAZIO", "03": "LAZIO", "04": "LAZIO",
  "05": "UMBRIA", "06": "UMBRIA",
  "07": "SARDEGNA", "08": "SARDEGNA", "09": "SARDEGNA",
  "10": "PIEMONTE", "12": "PIEMONTE", "13": "PIEMONTE", "14": "PIEMONTE",
  "15": "PIEMONTE", "28": "PIEMONTE",
  "11": "VALLE D'AOSTA",
  "16": "LIGURIA", "17": "LIGURIA", "18": "LIGURIA", "19": "LIGURIA",
  "20": "LOMBARDIA", "21": "LOMBARDIA", "22": "LOMBARDIA", "23": "LOMBARDIA",
  "24": "LOMBARDIA", "25": "LOMBARDIA", "26": "LOMBARDIA", "27": "LOMBARDIA",
  "46": "LOMBARDIA",
  "29": "EMILIA-ROMAGNA", "40": "EMILIA-ROMAGNA", "41": "EMILIA-ROMAGNA",
  "42": "EMILIA-ROMAGNA", "43": "EMILIA-ROMAGNA", "44": "EMILIA-ROMAGNA",
  "47": "EMILIA-ROMAGNA", "48": "EMILIA-ROMAGNA",
  "30": "VENETO", "31": "VENETO", "32": "VENETO", "35": "VENETO",
  "36": "VENETO", "37": "VENETO", "45": "VENETO",
  "33": "FRIULI-VENEZIA GIULIA", "34": "FRIULI-VENEZIA GIULIA",
  "38": "TRENTINO-ALTO ADIGE", "39": "TRENTINO-ALTO ADIGE",
  "50": "TOSCANA", "51": "TOSCANA", "52": "TOSCANA", "53": "TOSCANA",
  "54": "TOSCANA", "55": "TOSCANA", "56": "TOSCANA", "57": "TOSCANA",
  "58": "TOSCANA", "59": "TOSCANA",
  "60": "MARCHE", "61": "MARCHE", "62": "MARCHE", "63": "MARCHE",
  "64": "ABRUZZO", "65": "ABRUZZO", "66": "ABRUZZO", "67": "ABRUZZO",
  "70": "PUGLIA", "71": "PUGLIA", "72": "PUGLIA", "73": "PUGLIA", "74": "PUGLIA",
  "75": "BASILICATA", "85": "BASILICATA",
  "80": "CAMPANIA", "81": "CAMPANIA", "82": "CAMPANIA", "83": "CAMPANIA", "84": "CAMPANIA",
  "86": "MOLISE",
  "87": "CALABRIA", "88": "CALABRIA", "89": "CALABRIA",
  "90": "SICILIA", "91": "SICILIA", "92": "SICILIA", "93": "SICILIA", "94": "SICILIA",
  "95": "SICILIA", "96": "SICILIA", "97": "SICILIA", "98": "SICILIA",
};

// ─── Tipi ──────────────────────────────────────────────────────────────
export interface ShippingComputeInput {
  country: string;          // ISO Alpha-2 (es. "IT", "FR")
  postalCode: string;       // CAP
  province: string;         // codice provincia ISO (es. "MI", "RM", "AN")
  totalVolumeM3: number;
  totalBoxes: number;
  subtotalCents: number;
  shippingFloor: number;    // 0 = piano terra, >0 = consegna al piano
  withUnboxingService: boolean;
}

export interface ShippingComputeResult {
  standardShippingCents: number;
  floorDeliveryCents: number;
  unboxingFeeCents: number;
  totalShippingCents: number;
  freeShippingApplied: boolean;
  resolvedRegion: string | null;
  notes: string[];
}

export interface ShippingConfig {
  freeThresholdCents: number;
  itFallbackCents: number;
  frStandardPerM3Cents: number;
  unboxingPerM3Cents: number;
  rowPerBoxCents: number;
  // Tariffa consegna al piano per paese (keys UPPERCASE ISO; "ROW" = fallback).
  floorDeliveryByCountry: Record<string, number>;
  // Tariffe regionali. null = nessun override → fallback al default del paese.
  itRegionRates: Record<string, number | null>;
  frRegionRates: Record<string, number | null>;
  // Mappa département FR → région (per risolvere la régione dalla provincia).
  frDepartementToRegion: Record<string, string>;
}

// ─── Cache ─────────────────────────────────────────────────────────────
let _cache: { config: ShippingConfig; ts: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateShippingCache() {
  _cache = null;
}

function toInt(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadShippingConfig(): Promise<ShippingConfig> {
  const now = Date.now();
  if (_cache && now - _cache.ts < CACHE_TTL_MS) return _cache.config;

  try {
    const [settings, rates, frProvinces] = await Promise.all([
      prisma.setting.findMany({ where: { group: "shipping" } }),
      prisma.shippingRegionRate.findMany(),
      prisma.province.findMany({
        where: { countryCode: "FR" },
        select: { code: true, regionCode: true },
      }),
    ]);
    const sMap = new Map(settings.map((s) => [s.key, s.value] as const));

    // Tariffe regionali per paese (rateCents può essere null = nessun override)
    const itRegionRates: Record<string, number | null> = {};
    const frRegionRates: Record<string, number | null> = {};
    for (const r of rates) {
      if (r.countryCode === "IT") itRegionRates[r.code.toUpperCase()] = r.rateCents;
      else if (r.countryCode === "FR") frRegionRates[r.code.toUpperCase()] = r.rateCents;
    }

    // Mappa département → région (FR) per il lookup nel computeShipping
    const frDepartementToRegion: Record<string, string> = {};
    for (const p of frProvinces) frDepartementToRegion[p.code.toUpperCase()] = p.regionCode;

    const config: ShippingConfig = {
      freeThresholdCents:        toInt(sMap.get("shipping.free_threshold_cents"),         DEFAULTS.freeThresholdCents),
      itFallbackCents:           toInt(sMap.get("shipping.it_fallback_cents"),            DEFAULTS.itFallbackCents),
      frStandardPerM3Cents:      toInt(sMap.get("shipping.fr_standard_per_m3_cents"),     DEFAULTS.frStandardPerM3Cents),
      unboxingPerM3Cents:        toInt(sMap.get("shipping.unboxing_per_m3_cents"),        DEFAULTS.unboxingPerM3Cents),
      rowPerBoxCents:            toInt(sMap.get("shipping.row_per_box_cents"),            DEFAULTS.rowPerBoxCents),
      floorDeliveryByCountry:    floorDeliveryFromSettings(sMap),
      itRegionRates:             Object.keys(itRegionRates).length > 0
                                   ? { ...DEFAULT_REGION_RATES, ...itRegionRates }
                                   : DEFAULT_REGION_RATES,
      frRegionRates,
      frDepartementToRegion,
    };
    _cache = { config, ts: now };
    return config;
  } catch (e) {
    console.error("[shipping-rates] errore lettura DB, uso defaults:", e);
    return {
      ...DEFAULTS,
      itRegionRates: DEFAULT_REGION_RATES,
      frRegionRates: {},
      frDepartementToRegion: {},
      floorDeliveryByCountry: { ...DEFAULT_FLOOR_DELIVERY },
    };
  }
}

// Costruisce la mappa floorDeliveryByCountry leggendo i setting
// `shipping.floor_delivery_{cc}_per_m3_cents` (lowercase) per ogni paese.
// Esempio: chiave 'shipping.floor_delivery_it_per_m3_cents' → mappa['IT']
function floorDeliveryFromSettings(sMap: Map<string, string>): Record<string, number> {
  const result: Record<string, number> = { ...DEFAULT_FLOOR_DELIVERY };
  sMap.forEach((value, key) => {
    const m = key.match(/^shipping\.floor_delivery_([a-z]+)_per_m3_cents$/);
    if (!m) return;
    const cc = m[1].toUpperCase();
    const v = parseInt(value, 10);
    if (Number.isFinite(v) && v >= 0) result[cc] = v;
  });
  return result;
}

// Backward-compat: il vecchio import FREE_STANDARD_SHIPPING_THRESHOLD_CENTS
// resta esposto come funzione asincrona; per i pochi callers che lo usavano
// come costante numerica forniamo anche un default sincrono.
export async function getFreeShippingThresholdCents(): Promise<number> {
  return (await loadShippingConfig()).freeThresholdCents;
}
export const FREE_STANDARD_SHIPPING_THRESHOLD_CENTS = DEFAULTS.freeThresholdCents;

// ─── Helpers di lookup ─────────────────────────────────────────────────
function lookupRegionByProvince(provCode: string): string | null {
  const code = (provCode || "").trim().toUpperCase();
  if (!code) return null;
  return PROVINCE_TO_REGION[code] || null;
}
function lookupRegionByCAP(postalCode: string): string | null {
  const prefix = (postalCode || "").trim().slice(0, 2);
  if (!prefix) return null;
  return CAP_PREFIX_TO_REGION[prefix] || null;
}

// ─── API pubblica ──────────────────────────────────────────────────────
export async function computeShipping(input: ShippingComputeInput): Promise<ShippingComputeResult> {
  const cfg = await loadShippingConfig();
  const notes: string[] = [];
  const country = (input.country || "IT").toUpperCase();
  const cap = (input.postalCode || "").trim();
  const vol = Math.max(0, input.totalVolumeM3);
  const billableVol = Math.max(1, Math.ceil(vol));
  let resolvedRegion: string | null = null;

  // 1. Spedizione standard
  let standardShippingCents = 0;
  if (country === "IT") {
    const regionByProv = lookupRegionByProvince(input.province);
    if (regionByProv) {
      const rate = cfg.itRegionRates[regionByProv];
      if (rate != null) {
        standardShippingCents = rate;
        resolvedRegion = regionByProv;
        notes.push(`IT: provincia ${input.province.toUpperCase()} → ${regionByProv} → ${(rate / 100).toFixed(2)} EUR (flat)`);
      }
    }
    if (standardShippingCents === 0) {
      const regionByCap = lookupRegionByCAP(cap);
      if (regionByCap) {
        const rate = cfg.itRegionRates[regionByCap];
        if (rate != null) {
          standardShippingCents = rate;
          resolvedRegion = regionByCap;
          notes.push(`IT: CAP ${cap} → ${regionByCap} → ${(rate / 100).toFixed(2)} EUR (flat, fallback CAP)`);
        }
      }
    }
    if (standardShippingCents === 0) {
      standardShippingCents = cfg.itFallbackCents;
      notes.push(`IT: né provincia "${input.province}" né CAP "${cap}" riconosciuti → fallback ${(cfg.itFallbackCents / 100).toFixed(2)} EUR`);
    }
  } else if (country === "FR") {
    // Risolvi département → région. Se la régione ha un override esplicito
    // (rateCents != null), usalo. Altrimenti applica il default FR.
    // (La Corse 300€/m³ è impostata di base come override sulla régione "94".)
    const depCode = (input.province || "").trim().toUpperCase() || cap.slice(0, 2).toUpperCase();
    const regionCode = cfg.frDepartementToRegion[depCode] || null;
    let ratePerM3 = cfg.frStandardPerM3Cents;
    let appliedLabel = "default FR";
    if (regionCode && cfg.frRegionRates[regionCode] != null) {
      ratePerM3 = cfg.frRegionRates[regionCode] as number;
      appliedLabel = `régione ${regionCode}`;
      resolvedRegion = regionCode;
    }
    standardShippingCents = ratePerM3 * billableVol;
    notes.push(`FR: ${appliedLabel} → ${ratePerM3 / 100}€/m³ × ${billableVol}m³ fatturabili (reali ${vol.toFixed(3)}m³) = ${(standardShippingCents / 100).toFixed(2)} EUR`);
  } else {
    const boxes = Math.max(1, Math.floor(input.totalBoxes));
    standardShippingCents = cfg.rowPerBoxCents * boxes;
    notes.push(`RoW (${country}): ${cfg.rowPerBoxCents / 100}€ × ${boxes} scatola/e = ${(standardShippingCents / 100).toFixed(2)} EUR`);
  }

  // 2. Soglia free shipping (zera SOLO la standard)
  let freeShippingApplied = false;
  if (input.subtotalCents >= cfg.freeThresholdCents) {
    standardShippingCents = 0;
    freeShippingApplied = true;
    notes.push(`Subtotale ≥ ${(cfg.freeThresholdCents / 100).toFixed(2)}€ → spedizione standard gratuita`);
  }

  // 3. Consegna al piano (additiva, anche con free standard)
  let floorDeliveryCents = 0;
  if (input.shippingFloor > 0) {
    const cc = country.toUpperCase();
    const ratePerM3 = cfg.floorDeliveryByCountry[cc] ?? cfg.floorDeliveryByCountry.ROW ?? DEFAULT_FLOOR_DELIVERY.ROW;
    floorDeliveryCents = ratePerM3 * billableVol;
    notes.push(`Consegna al piano (piano ${input.shippingFloor}): ${ratePerM3 / 100}€/m³ × ${billableVol}m³ fatturabili = ${(floorDeliveryCents / 100).toFixed(2)} EUR`);
  }

  // 4. Disimballo + smaltimento (additivo)
  let unboxingFeeCents = 0;
  if (input.withUnboxingService) {
    unboxingFeeCents = cfg.unboxingPerM3Cents * billableVol;
    notes.push(`Disimballo: ${cfg.unboxingPerM3Cents / 100}€/m³ × ${billableVol}m³ fatturabili = ${(unboxingFeeCents / 100).toFixed(2)} EUR`);
  }

  return {
    standardShippingCents,
    floorDeliveryCents,
    unboxingFeeCents,
    totalShippingCents: standardShippingCents + floorDeliveryCents + unboxingFeeCents,
    freeShippingApplied,
    resolvedRegion,
    notes,
  };
}

// ─── Esposizione defaults (utile per seed iniziale dall'admin) ─────────
export function getDefaultShippingConfig(): ShippingConfig {
  return {
    ...DEFAULTS,
    itRegionRates: { ...DEFAULT_REGION_RATES },
    frRegionRates: {},
    frDepartementToRegion: {},
    floorDeliveryByCountry: { ...DEFAULT_FLOOR_DELIVERY },
  };
}
