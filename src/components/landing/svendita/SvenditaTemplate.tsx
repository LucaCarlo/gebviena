import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Globe, MapPin } from "lucide-react";
import SubscribeForm, { type FieldConfig } from "@/components/landing/accesso-svendita-gtv/SubscribeForm";
import HeaderLanguageSwitcher from "@/components/layout/HeaderLanguageSwitcher";

const DEFAULTS = {
  heroTitle: "Accesso Riservato alla Vendita Speciale Gebrüder Thonet Vienna",
  heroSubtitle:
    "Due modalità di accesso, un'unica selezione: online su registrazione, in showroom per una scoperta esclusiva.",
  buttonLabel: "Ottieni Accesso",
  privacyLabel: "Accetto l'informativa sulla privacy e il trattamento dei miei dati personali.",
  navLabelActive: "Vendita Speciale",
  navLabelShowroom: "Showroom",
  navLabelContatti: "Contatti",
  navLinkShowroom: "/",
  navLinkContatti: "/contatti/richiesta-info",
  eyebrow: "Vendita Speciale",
  block1Title: "Online",
  block1Lines: ["Accesso su registrazione", "Selezione disponibile fino a esaurimento"],
  block1HighlightPrefix: "Sconti fino al ",
  block1HighlightStrong: "40%",
  block1Period: "Dal 15 Maggio al 30 Giugno 2026",
  block2Title: "Showroom Torino",
  block2Lines: ["Via Foggia 23H", "Accesso diretto in showroom", "Pezzi unici da fine serie, shooting e fiere"],
  block2HighlightPrefix: "Sconti fino al ",
  block2HighlightStrong: "70%",
  block2Period: "Dal 15 Maggio al 30 Giugno 2026",
  longDescription: `La Vendita Speciale nasce da un processo di ottimizzazione della nostra logistica e supply chain, volto alla centralizzazione e all'efficientamento dei magazzini.

Questo percorso ci permette di rendere disponibili una selezione di prodotti a condizioni dedicate, attraverso due esperienze distinte:

- **online**, con articoli disponibili in quantità limitata
- **offline**, con una selezione esclusiva di pezzi unici e fuori produzione

Due modalità diverse, unite dalla stessa attenzione per qualità e ricerca.`,
  formCardTitle: "Richiedi Accesso",
  formCardSubtitle: "Registrati per accedere alla vendita speciale online.",
  successCardTitle: "Richiesta inviata",
  successCardMessage: "Ti abbiamo inviato un'email di conferma all'indirizzo che ci hai fornito. A breve riceverai le istruzioni per accedere alla vendita speciale online.",
  disclaimer: `L'accesso online è riservato agli utenti registrati.
I prodotti disponibili online e in showroom differiscono per tipologia e disponibilità.
La registrazione non garantisce disponibilità sugli articoli.`,
};

const DEFAULT_FORM_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "Nome", width: "100", enabled: true, order: 0 },
  { key: "lastName", label: "Cognome", width: "100", enabled: true, order: 1 },
  { key: "email", label: "Email", width: "100", enabled: true, order: 2 },
  { key: "company", label: "Azienda", width: "100", enabled: true, order: 3 },
];

interface CustomCfg {
  navLabelActive?: string;
  navLabelShowroom?: string;
  navLabelContatti?: string;
  navLinkShowroom?: string;
  navLinkContatti?: string;
  eyebrow?: string;
  block1Title?: string;
  block1Lines?: string[] | string;
  block1HighlightPrefix?: string;
  block1HighlightStrong?: string;
  block1Period?: string;
  block2Title?: string;
  block2Lines?: string[] | string;
  block2HighlightPrefix?: string;
  block2HighlightStrong?: string;
  block2Period?: string;
  longDescription?: string;
  formCardTitle?: string;
  formCardSubtitle?: string;
  successCardTitle?: string;
  successCardMessage?: string;
  disclaimer?: string;
}

export interface SvenditaTemplateProps {
  row: {
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    bannerImage?: string | null;
    buttonLabel?: string | null;
    privacyLabel?: string | null;
    formFields?: string | null;
    customConfig?: string | null;
  };
  translation?: {
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    buttonLabel?: string | null;
    privacyLabel?: string | null;
    navLabelActive?: string | null;
    navLabelShowroom?: string | null;
    navLabelContatti?: string | null;
    eyebrow?: string | null;
    block1Title?: string | null;
    block1Lines?: string | null;
    block1HighlightPrefix?: string | null;
    block1HighlightStrong?: string | null;
    block1Period?: string | null;
    block2Title?: string | null;
    block2Lines?: string | null;
    block2HighlightPrefix?: string | null;
    block2HighlightStrong?: string | null;
    block2Period?: string | null;
    longDescription?: string | null;
    formCardTitle?: string | null;
    formCardSubtitle?: string | null;
    successCardTitle?: string | null;
    successCardMessage?: string | null;
    disclaimer?: string | null;
  } | null;
}

// Returns translation value if non-empty string, otherwise fallback
function pick<T extends string | null | undefined>(t: T, fallback: string): string {
  if (typeof t === "string" && t.trim().length > 0) return t;
  return fallback;
}

export default function SvenditaTemplate({ row, translation }: SvenditaTemplateProps) {
  let formFields: FieldConfig[] = DEFAULT_FORM_FIELDS;
  if (row.formFields) {
    try {
      const parsed = JSON.parse(row.formFields);
      if (Array.isArray(parsed) && parsed.length > 0) formFields = parsed as FieldConfig[];
    } catch { /* defaults */ }
  }

  let custom: CustomCfg = {};
  if (row.customConfig) {
    try {
      const parsed = JSON.parse(row.customConfig);
      if (parsed && typeof parsed === "object") custom = parsed as CustomCfg;
    } catch { /* defaults */ }
  }
  const baseCustom = { ...DEFAULTS, ...custom } as typeof DEFAULTS;

  // Merge translation: per ogni campo traducibile, usa la traduzione se presente; altrimenti fallback IT.
  // I link (navLinkShowroom/Contatti) NON sono traducibili: restano dalla config IT.
  const t = translation || {};
  const c = {
    ...baseCustom,
    navLabelActive: pick(t.navLabelActive, baseCustom.navLabelActive),
    navLabelShowroom: pick(t.navLabelShowroom, baseCustom.navLabelShowroom),
    navLabelContatti: pick(t.navLabelContatti, baseCustom.navLabelContatti),
    eyebrow: pick(t.eyebrow, baseCustom.eyebrow),
    block1Title: pick(t.block1Title, baseCustom.block1Title),
    block1Lines: t.block1Lines && t.block1Lines.trim().length > 0 ? t.block1Lines : baseCustom.block1Lines,
    block1HighlightPrefix: pick(t.block1HighlightPrefix, baseCustom.block1HighlightPrefix),
    block1HighlightStrong: pick(t.block1HighlightStrong, baseCustom.block1HighlightStrong),
    block1Period: pick(t.block1Period, baseCustom.block1Period),
    block2Title: pick(t.block2Title, baseCustom.block2Title),
    block2Lines: t.block2Lines && t.block2Lines.trim().length > 0 ? t.block2Lines : baseCustom.block2Lines,
    block2HighlightPrefix: pick(t.block2HighlightPrefix, baseCustom.block2HighlightPrefix),
    block2HighlightStrong: pick(t.block2HighlightStrong, baseCustom.block2HighlightStrong),
    block2Period: pick(t.block2Period, baseCustom.block2Period),
    longDescription: pick(t.longDescription, baseCustom.longDescription),
    formCardTitle: pick(t.formCardTitle, baseCustom.formCardTitle),
    formCardSubtitle: pick(t.formCardSubtitle, baseCustom.formCardSubtitle),
    successCardTitle: pick(t.successCardTitle, baseCustom.successCardTitle),
    successCardMessage: pick(t.successCardMessage, baseCustom.successCardMessage),
    disclaimer: pick(t.disclaimer, baseCustom.disclaimer),
  };

  const heroTitle = pick(t.heroTitle, row.heroTitle || DEFAULTS.heroTitle);
  const heroSubtitle = pick(t.heroSubtitle, row.heroSubtitle || DEFAULTS.heroSubtitle);
  const bannerImage = row.bannerImage || "";
  const buttonLabel = pick(t.buttonLabel, row.buttonLabel || DEFAULTS.buttonLabel);
  const privacyLabel = pick(t.privacyLabel, row.privacyLabel || DEFAULTS.privacyLabel);

  return (
    <div className="font-sans bg-white text-dark">
      {/* ─── Header ─── */}
      <header className="px-6 md:px-10 py-5 md:py-6 flex items-center justify-between gap-4">
        <Link href="/" className="text-[13px] md:text-[14px] font-medium tracking-[0.18em] uppercase text-dark hover:opacity-70 transition-opacity">
          Gebr&uuml;der Thonet Vienna
        </Link>
        <div className="flex items-center gap-7">
          <nav className="hidden sm:flex items-center gap-7 text-[11px] md:text-[12px] font-semibold tracking-[0.14em] uppercase">
            <span className="text-dark border-b-2 border-dark pb-1">{c.navLabelActive}</span>
            <Link href={c.navLinkShowroom || DEFAULTS.navLinkShowroom} className="text-warm-600 hover:text-dark transition-colors">{c.navLabelShowroom}</Link>
            <Link href={c.navLinkContatti || DEFAULTS.navLinkContatti} className="text-warm-600 hover:text-dark transition-colors">{c.navLabelContatti}</Link>
          </nav>
          <div className="text-dark">
            <HeaderLanguageSwitcher isScrolled={true} />
          </div>
        </div>
      </header>

      {/* ─── Banner ─── */}
      <section>
        <div className="relative w-full aspect-[24/5] bg-warm-100/70 border-y border-warm-200 overflow-hidden">
          {bannerImage ? (
            <Image
              src={bannerImage}
              alt="Vendita Speciale Gebrüder Thonet Vienna"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-warm-400">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-1">Banner</p>
                <p className="text-[11px]">Spazio riservato all&apos;immagine prodotti</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Content ─── */}
      <section className="px-6 md:px-10 pt-12 md:pt-16 pb-16 md:pb-24">
        <div className="w-full md:w-3/4 max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 lg:gap-20">
          <div>
            <p className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.18em] text-warm-600 mb-5">
              {c.eyebrow}
            </p>
            <h1 className="text-[34px] md:text-[44px] lg:text-[48px] font-semibold leading-[1.08] text-dark mb-6 tracking-[-0.01em]">
              {heroTitle}
            </h1>
            <p className="text-[15px] md:text-[16px] text-warm-700 leading-[1.6] mb-10 max-w-[480px] whitespace-pre-line">
              {heroSubtitle}
            </p>

            <div className="grid grid-cols-2 border border-warm-200 mb-10 max-w-[520px]">
              <div className="p-4 border-r border-warm-200">
                <InfoBlock
                  icon={<Globe size={18} strokeWidth={1.6} />}
                  title={c.block1Title || DEFAULTS.block1Title}
                  lines={pickArr(c.block1Lines, DEFAULTS.block1Lines)}
                  highlight={c.block1HighlightStrong ? [c.block1HighlightPrefix || "", c.block1HighlightStrong] : undefined}
                />
              </div>
              <div className="p-4">
                <InfoBlock
                  icon={<MapPin size={18} strokeWidth={1.6} />}
                  title={c.block2Title || DEFAULTS.block2Title}
                  lines={pickArr(c.block2Lines, DEFAULTS.block2Lines)}
                  highlight={c.block2HighlightStrong ? [c.block2HighlightPrefix || "", c.block2HighlightStrong] : undefined}
                />
              </div>
              <div className="px-4 py-3 border-t border-r border-warm-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-500 mb-1">Periodo</p>
                <p className="text-[13px] text-warm-700 leading-[1.55]">{c.block1Period || DEFAULTS.block1Period}</p>
              </div>
              <div className="px-4 py-3 border-t border-warm-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-500 mb-1">Periodo</p>
                <p className="text-[13px] text-warm-700 leading-[1.55]">{c.block2Period || DEFAULTS.block2Period}</p>
              </div>
            </div>

            {/* Form duplicato per mobile: appare subito dopo la tabellina, prima della descrizione lunga.
                Su md+ è nascosto perché la colonna destra (sticky) lo mostra. */}
            <div className="md:hidden mb-10">
              <Suspense fallback={<div className="bg-warm-50/40 border border-warm-200 rounded-sm p-7 h-[400px]" />}>
                <SubscribeForm
                  buttonLabel={buttonLabel}
                  privacyLabel={privacyLabel}
                  fields={formFields}
                  cardTitle={c.formCardTitle}
                  cardSubtitle={c.formCardSubtitle}
                  successTitle={c.successCardTitle}
                  successMessage={c.successCardMessage}
                />
              </Suspense>
              <p className="text-[11px] text-warm-500 leading-[1.7] mt-5 px-1 whitespace-pre-line">
                {c.disclaimer || DEFAULTS.disclaimer}
              </p>
            </div>

            <div className="text-[14px] md:text-[14.5px] text-warm-700 leading-[1.7] max-w-[520px]
              [&_p]:mb-3 [&_p:last-child]:mb-0
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1.5 [&_ul]:marker:text-warm-400
              [&_strong]:font-semibold [&_strong]:text-dark"
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(c.longDescription || DEFAULTS.longDescription) }}
            />
          </div>

          {/* Colonna destra (form sticky) — solo da md in su; su mobile c'è la versione duplicata sopra */}
          <div className="md:pt-2 hidden md:block">
            <div className="md:sticky md:top-8">
              <Suspense fallback={<div className="bg-warm-50/40 border border-warm-200 rounded-sm p-7 md:p-9 h-[400px]" />}>
                <SubscribeForm
                  buttonLabel={buttonLabel}
                  privacyLabel={privacyLabel}
                  fields={formFields}
                  cardTitle={c.formCardTitle}
                  cardSubtitle={c.formCardSubtitle}
                  successTitle={c.successCardTitle}
                  successMessage={c.successCardMessage}
                />
              </Suspense>
              <p className="text-[11px] text-warm-500 leading-[1.7] mt-5 px-1 whitespace-pre-line">
                {c.disclaimer || DEFAULTS.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  lines,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  highlight?: [string, string];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-warm-700">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warm-700">{title}</span>
      </div>
      <div className="text-[13px] text-warm-700 leading-[1.55] space-y-0.5">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
        {highlight && highlight[1] && (
          <p className="pt-1 text-dark">
            {highlight[0]}<span className="font-bold">{highlight[1]}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function pickArr(v: string[] | string | undefined, fallback: string[]): string[] {
  if (Array.isArray(v)) return v.length > 0 ? v : fallback;
  if (typeof v === "string") {
    const arr = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return arr.length > 0 ? arr : fallback;
  }
  return fallback;
}

function renderSimpleMarkdown(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inP = false;
  const closeP = () => { if (inP) { out.push("</p>"); inP = false; } };
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeP(); closeList(); continue; }
    if (/^[-*] /.test(line)) {
      closeP();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${escape(line.replace(/^[-*] /, "")).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`);
      continue;
    }
    closeList();
    if (!inP) { out.push("<p>"); inP = true; } else { out.push(" "); }
    out.push(escape(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));
  }
  closeP(); closeList();
  return out.join("");
}
