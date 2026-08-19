/**
 * Preset delle "strutture didascalia" importate dall'excel forniti dal cliente.
 * Ogni struttura = un tipo di prodotto (es. SEDIE) con le sue parti (Struttura,
 * Seduta, Schienale, ecc.) e per ciascuna parte gli attributi previsti
 * (Materiale, Finitura, Tessuto, Categoria prezzo, Codice colore).
 *
 * Usato:
 *  - Dal seed iniziale (scripts/seed-caption-schemas.ts) per popolare la tabella
 *    ProductCaptionType al primo deploy. Non sovrascrive schemi gia' editati.
 *  - Dal frontend/backend NON e' letto direttamente: il source of truth resta il DB
 *    (l'admin puo' modificare/aggiungere strutture da /admin/caption-schemas).
 */

export interface CaptionPart {
  /** Chiave stabile (usata come slug). */
  key: string;
  /** Etichetta italiana visibile. */
  label: string;
  /** Attributi previsti per questa parte. */
  attributes: CaptionAttribute[];
}

export interface CaptionAttribute {
  /** Chiave stabile. */
  key: string;
  /** Etichetta italiana visibile. */
  label: string;
}

export interface CaptionTypePreset {
  key: string;
  label: string;
  parts: CaptionPart[];
}

const ATTR = {
  materiale: { key: "materiale", label: "Materiale" },
  finitura: { key: "finitura", label: "Finitura" },
  tessuto: { key: "tessuto", label: "Tessuto" },
  categoriaPrezzo: { key: "categoria_prezzo", label: "Categoria prezzo" },
  codiceColore: { key: "codice_colore", label: "Codice colore" },
} as const;

function part(key: string, label: string, attrs: CaptionAttribute[]): CaptionPart {
  return { key, label, attributes: attrs };
}

export const CAPTION_TYPE_PRESETS: CaptionTypePreset[] = [
  {
    key: "SEDIE",
    label: "Sedie / Sedie con braccioli / Dondoli / Pouf",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("seduta", "Seduta", [ATTR.materiale, ATTR.finitura, ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("schienale", "Schienale", [ATTR.materiale, ATTR.finitura, ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
    ],
  },
  {
    key: "DIVANI_POLTRONE",
    label: "Divani / Poltrone",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("cuscino_seduta", "Cuscino seduta", [ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("cuscino_schienale", "Cuscino schienale", [ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("piping", "Piping", [ATTR.codiceColore]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "TAVOLI_BAR",
    label: "Tavoli da bar",
    parts: [
      part("base", "Base", [ATTR.materiale, ATTR.finitura]),
      part("gambo", "Gambo", [ATTR.materiale, ATTR.finitura]),
      part("cornice", "Cornice", [ATTR.materiale, ATTR.finitura]),
      part("piano", "Piano", [ATTR.materiale, ATTR.finitura]),
    ],
  },
  {
    key: "TAVOLI_PRANZO_SCRIVANIE",
    label: "Tavoli da pranzo / Scrivanie",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("piano", "Piano", [ATTR.materiale, ATTR.finitura]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "TAVOLINI_COMODINI",
    label: "Tavolini / Comodini",
    parts: [
      part("base", "Base", [ATTR.materiale, ATTR.finitura]),
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("piano", "Piano", [ATTR.materiale, ATTR.finitura]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "MOBILI_CONTENITORI",
    label: "Mobili contenitori",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("inserti", "Inserti", [ATTR.materiale]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
    ],
  },
  {
    key: "SGABELLI",
    label: "Sgabelli",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("seduta", "Seduta", [ATTR.materiale, ATTR.finitura]),
      part("schienale", "Schienale", [ATTR.materiale, ATTR.finitura]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "PANCHE",
    label: "Panche",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("seduta", "Seduta", [ATTR.materiale, ATTR.finitura]),
      part("cuscino_seduta", "Cuscino seduta", [ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "APPENDIABITI",
    label: "Appendiabiti",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("dettagli", "Dettagli", [ATTR.materiale]),
    ],
  },
  {
    key: "TESTIERE",
    label: "Testiere",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("rivestimento", "Rivestimento", [ATTR.tessuto, ATTR.categoriaPrezzo]),
      part("inserti", "Inserti", [ATTR.materiale]),
      part("dettagli", "Dettagli", [ATTR.materiale]),
    ],
  },
  {
    key: "LAMPADE",
    label: "Lampade",
    parts: [
      part("base", "Base", [ATTR.materiale]),
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("tessuto", "Tessuto", [ATTR.tessuto]),
      part("bordino", "Bordino", [ATTR.tessuto, ATTR.codiceColore]),
      part("diffusore", "Diffusore", [ATTR.materiale]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "SERVOMUTO",
    label: "Servomuto",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("inserti", "Inserti", [ATTR.materiale]),
    ],
  },
  {
    key: "PARAVENTO",
    label: "Paravento",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("rivestimento", "Rivestimento", [ATTR.tessuto, ATTR.categoriaPrezzo]),
    ],
  },
  {
    key: "PORTAOMBRELLI",
    label: "Portaombrelli",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
      part("dettagli", "Dettagli", [ATTR.materiale]),
      part("dettaglio_piedini", "Dettaglio piedini", [ATTR.materiale]),
    ],
  },
  {
    key: "SPECCHI",
    label: "Specchi",
    parts: [
      part("struttura", "Struttura", [ATTR.materiale, ATTR.finitura]),
    ],
  },
  {
    key: "TAPPETI",
    label: "Tappeti",
    parts: [
      part("variante", "Nome variante", [
        { key: "nome", label: "Nome" },
      ]),
    ],
  },
];
