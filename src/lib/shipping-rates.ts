/**
 * Tariffe di spedizione — specifiche cliente vendita speciale 2026.
 *
 * IT:  tariffa FLAT per regione. Lookup primario via codice provincia
 *      (es. "MI" → Lombardia → 70€). Fallback: prefisso CAP 2 cifre.
 *      Se nessuno match, fallback alla tariffa massima (Sicilia/Sardegna 162€).
 * FR:  per m³. 186€/m³ standard; 300€/m³ se CAP inizia con "20" (Corsica).
 * Altri paesi: fallback flat per scatola (logica precedente, 90€/scatola).
 *
 * Soglia spedizione gratuita: 950€ subtotale (azzera SOLO la quota standard).
 * Servizi aggiuntivi (consegna al piano, disimballo) restano fatturati anche
 * quando la spedizione standard è gratuita.
 */

// ─── Costanti tariffe ──────────────────────────────────────────────────
export const FREE_STANDARD_SHIPPING_THRESHOLD_CENTS = 95000; // 950 EUR

// Servizi aggiuntivi (cents per m³)
export const FLOOR_DELIVERY_PER_M3_CENTS_IT = 12000; // 120€/m³
export const FLOOR_DELIVERY_PER_M3_CENTS_FR = 14000; // 140€/m³
export const UNBOXING_PER_M3_CENTS = 2000;           // 20€/m³

// Francia per m³
export const FR_STANDARD_PER_M3_CENTS = 18600;       // 186€/m³
export const FR_CORSICA_PER_M3_CENTS = 30000;        // 300€/m³ (CAP "20…")

// ─── IT: tariffa flat per regione (cents) ─────────────────────────────
const REGION_RATE_CENTS: Record<string, number> = {
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

// Tariffa di fallback IT se non riconosciamo né provincia né CAP.
const IT_FALLBACK_CENTS = 16200; // = max (Sicilia/Sardegna), così non sottostimo

// ─── IT: mapping codice provincia ISO 3166-2:IT → regione ──────────────
// Le 107 province italiane (post-riforma 2015).
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
  // PUGLIA — sia BT (ISO) che BAT (codice alternativo) per Barletta-Andria-Trani
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

// ─── IT: fallback CAP-prefix → tariffa (cents) ────────────────────────
// Usato solo se la provincia non viene trovata o è vuota.
const IT_RATE_BY_CAP_PREFIX: Record<string, number> = {
  "00": 10300, "01": 10300, "02": 10300, "03": 10300, "04": 10300, // LAZIO
  "05": 9900, "06": 9900,                                            // UMBRIA
  "07": 16200, "08": 16200, "09": 16200,                              // SARDEGNA
  "10": 8200, "12": 8200, "13": 8200, "14": 8200, "15": 8200, "28": 8200, // PIEMONTE
  "11": 9200,                                                          // VALLE D'AOSTA
  "16": 8800, "17": 8800, "18": 8800, "19": 8800,                       // LIGURIA
  "20": 7000, "21": 7000, "22": 7000, "23": 7000, "24": 7000,
  "25": 7000, "26": 7000, "27": 7000, "46": 7000,                       // LOMBARDIA
  "29": 8200, "40": 8200, "41": 8200, "42": 8200, "43": 8200,
  "44": 8200, "47": 8200, "48": 8200,                                   // EMILIA-ROMAGNA
  "30": 8200, "31": 8200, "32": 8200, "35": 8200, "36": 8200,
  "37": 8200, "45": 8200,                                               // VENETO
  "33": 8800, "34": 8800,                                               // FRIULI VG
  "38": 8800, "39": 8800,                                               // TRENTINO AA
  "50": 9400, "51": 9400, "52": 9400, "53": 9400, "54": 9400,
  "55": 9400, "56": 9400, "57": 9400, "58": 9400, "59": 9400,            // TOSCANA
  "60": 9400, "61": 9400, "62": 9400, "63": 9400,                       // MARCHE
  "64": 11000, "65": 11000, "66": 11000, "67": 11000,                   // ABRUZZO
  "70": 12000, "71": 12000, "72": 12000, "73": 12000, "74": 12000,       // PUGLIA
  "75": 14300, "85": 14300,                                             // BASILICATA
  "80": 12000, "81": 12000, "82": 12000, "83": 12000, "84": 12000,       // CAMPANIA
  "86": 12200,                                                          // MOLISE
  "87": 14300, "88": 14300, "89": 14300,                                // CALABRIA
  "90": 16200, "91": 16200, "92": 16200, "93": 16200, "94": 16200,
  "95": 16200, "96": 16200, "97": 16200, "98": 16200,                   // SICILIA
};

// ─── Tipi ──────────────────────────────────────────────────────────────
export interface ShippingComputeInput {
  country: string;          // ISO Alpha-2 (es. "IT", "FR")
  postalCode: string;       // CAP
  province: string;         // codice provincia ISO (es. "MI", "RM", "AN")
  totalVolumeM3: number;    // volume totale m³
  totalBoxes: number;       // numero scatole (fallback RoW)
  subtotalCents: number;    // subtotale ordine in cents
  shippingFloor: number;    // 0 = piano terra (bordo strada), >0 = consegna al piano
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

// ─── Helpers ───────────────────────────────────────────────────────────
function lookupItalyByProvince(provCode: string): { rateCents: number; region: string } | null {
  const code = (provCode || "").trim().toUpperCase();
  if (!code) return null;
  const region = PROVINCE_TO_REGION[code];
  if (!region) return null;
  const rate = REGION_RATE_CENTS[region];
  if (rate == null) return null;
  return { rateCents: rate, region };
}

function lookupItalyByCAP(postalCode: string): { rateCents: number; region: string } | null {
  const prefix = (postalCode || "").trim().slice(0, 2);
  if (!prefix) return null;
  const rate = IT_RATE_BY_CAP_PREFIX[prefix];
  if (rate == null) return null;
  // Cerca la regione corrispondente per il display
  const region = Object.keys(REGION_RATE_CENTS).find((r) => REGION_RATE_CENTS[r] === rate) || null;
  return { rateCents: rate, region: region || "" };
}

// ─── API pubblica ──────────────────────────────────────────────────────
export function computeShipping(input: ShippingComputeInput): ShippingComputeResult {
  const notes: string[] = [];
  const country = (input.country || "IT").toUpperCase();
  const cap = (input.postalCode || "").trim();
  const vol = Math.max(0, input.totalVolumeM3);
  let resolvedRegion: string | null = null;

  // 1. Spedizione standard
  let standardShippingCents = 0;
  if (country === "IT") {
    const byProv = lookupItalyByProvince(input.province);
    if (byProv) {
      standardShippingCents = byProv.rateCents;
      resolvedRegion = byProv.region;
      notes.push(`IT: provincia ${input.province.toUpperCase()} → ${byProv.region} → ${(byProv.rateCents / 100).toFixed(2)} EUR (flat)`);
    } else {
      const byCap = lookupItalyByCAP(cap);
      if (byCap) {
        standardShippingCents = byCap.rateCents;
        resolvedRegion = byCap.region;
        notes.push(`IT: CAP ${cap} → ${byCap.region} → ${(byCap.rateCents / 100).toFixed(2)} EUR (flat, fallback CAP)`);
      } else {
        standardShippingCents = IT_FALLBACK_CENTS;
        notes.push(`IT: né provincia "${input.province}" né CAP "${cap}" riconosciuti → fallback ${(IT_FALLBACK_CENTS / 100).toFixed(2)} EUR`);
      }
    }
  } else if (country === "FR") {
    const ratePerM3 = cap.startsWith("20") ? FR_CORSICA_PER_M3_CENTS : FR_STANDARD_PER_M3_CENTS;
    standardShippingCents = Math.round(ratePerM3 * vol);
    notes.push(`FR: CAP ${cap} → ${ratePerM3 / 100}€/m³ × ${vol}m³ = ${(standardShippingCents / 100).toFixed(2)} EUR`);
  } else {
    const boxes = Math.max(1, Math.floor(input.totalBoxes));
    standardShippingCents = 9000 * boxes;
    notes.push(`RoW (${country}): 90€ × ${boxes} scatola/e = ${(standardShippingCents / 100).toFixed(2)} EUR`);
  }

  // 2. Soglia free shipping (zera SOLO la standard)
  let freeShippingApplied = false;
  if (input.subtotalCents >= FREE_STANDARD_SHIPPING_THRESHOLD_CENTS) {
    standardShippingCents = 0;
    freeShippingApplied = true;
    notes.push(`Subtotale ≥ 950€ → spedizione standard gratuita`);
  }

  // 3. Consegna al piano (additiva, anche con free standard)
  let floorDeliveryCents = 0;
  if (input.shippingFloor > 0) {
    const ratePerM3 = country === "FR" ? FLOOR_DELIVERY_PER_M3_CENTS_FR : FLOOR_DELIVERY_PER_M3_CENTS_IT;
    floorDeliveryCents = Math.round(ratePerM3 * vol);
    notes.push(`Consegna al piano (piano ${input.shippingFloor}): ${ratePerM3 / 100}€/m³ × ${vol}m³ = ${(floorDeliveryCents / 100).toFixed(2)} EUR`);
  }

  // 4. Disimballo + smaltimento (additivo)
  let unboxingFeeCents = 0;
  if (input.withUnboxingService) {
    unboxingFeeCents = Math.round(UNBOXING_PER_M3_CENTS * vol);
    notes.push(`Disimballo: 20€/m³ × ${vol}m³ = ${(unboxingFeeCents / 100).toFixed(2)} EUR`);
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
