import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Globe, MapPin, Calendar } from "lucide-react";
import SubscribeForm, { type FieldConfig } from "@/components/landing/accesso-svendita-gtv/SubscribeForm";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Accesso Riservato — Vendita Speciale | Gebrüder Thonet Vienna",
  description:
    "Registrati per accedere alla Vendita Speciale Gebrüder Thonet Vienna. Sconti fino al 40% online e fino al 70% in showroom a Torino.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PERMALINK = "accesso-svendita-gtv";

const DEFAULTS = {
  heroTitle: "Accesso Riservato alla Vendita Speciale Gebrüder Thonet Vienna",
  heroSubtitle:
    "Due modalità di accesso, un'unica selezione: online su registrazione, in showroom per una scoperta esclusiva.",
  buttonLabel: "Ottieni Accesso",
  privacyLabel: "Accetto l'informativa sulla privacy e il trattamento dei miei dati personali.",
  // Custom config — testi specifici della landing svendita
  navLabelActive: "Vendita Speciale",
  navLabelShowroom: "Showroom",
  navLabelContatti: "Contatti",
  eyebrow: "Vendita Speciale",
  block1Title: "Online",
  block1Lines: ["Accesso su registrazione", "Selezione disponibile fino a esaurimento"],
  block1HighlightPrefix: "Sconti fino al ",
  block1HighlightStrong: "40%",
  block2Title: "Showroom Torino",
  block2Lines: ["Via Foggia 23H", "Accesso diretto in showroom", "Pezzi unici da fine serie, shooting e fiere"],
  block2HighlightPrefix: "Sconti fino al ",
  block2HighlightStrong: "70%",
  block3Title: "Periodo",
  block3Lines: ["Dal 15 Maggio al 30 Giugno 2026"],
  longDescription: `La Vendita Speciale nasce da un processo di ottimizzazione della nostra logistica e supply chain, volto alla centralizzazione e all'efficientamento dei magazzini.

Questo percorso ci permette di rendere disponibili una selezione di prodotti a condizioni dedicate, attraverso due esperienze distinte:

- **online**, con articoli disponibili in quantità limitata
- **offline**, con una selezione esclusiva di pezzi unici e fuori produzione

Due modalità diverse, unite dalla stessa attenzione per qualità e ricerca.`,
  formCardTitle: "Richiedi Accesso",
  formCardSubtitle: "Registrati per accedere alla vendita speciale online.",
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
  eyebrow?: string;
  block1Title?: string;
  block1Lines?: string[] | string;
  block1HighlightPrefix?: string;
  block1HighlightStrong?: string;
  block2Title?: string;
  block2Lines?: string[] | string;
  block2HighlightPrefix?: string;
  block2HighlightStrong?: string;
  block3Title?: string;
  block3Lines?: string[] | string;
  longDescription?: string;
  formCardTitle?: string;
  formCardSubtitle?: string;
  disclaimer?: string;
}

async function loadConfig() {
  try {
    const cfg = await prisma.landingPageConfig.findUnique({ where: { permalink: PERMALINK } });
    if (!cfg || !cfg.isActive) return null;

    let formFields: FieldConfig[] = DEFAULT_FORM_FIELDS;
    if (cfg.formFields) {
      try {
        const parsed = JSON.parse(cfg.formFields);
        if (Array.isArray(parsed) && parsed.length > 0) formFields = parsed as FieldConfig[];
      } catch { /* defaults */ }
    }

    let custom: CustomCfg = {};
    if (cfg.customConfig) {
      try {
        const parsed = JSON.parse(cfg.customConfig);
        if (parsed && typeof parsed === "object") custom = parsed as CustomCfg;
      } catch { /* defaults */ }
    }

    return {
      heroTitle: cfg.heroTitle || DEFAULTS.heroTitle,
      heroSubtitle: cfg.heroSubtitle || DEFAULTS.heroSubtitle,
      bannerImage: cfg.bannerImage || "",
      buttonLabel: cfg.buttonLabel || DEFAULTS.buttonLabel,
      privacyLabel: cfg.privacyLabel || DEFAULTS.privacyLabel,
      formFields,
      custom: { ...DEFAULTS, ...custom } as typeof DEFAULTS,
    };
  } catch {
    return null;
  }
}

function pickArr(v: string[] | string | undefined, fallback: string[]): string[] {
  if (Array.isArray(v)) return v.length > 0 ? v : fallback;
  if (typeof v === "string") {
    const arr = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return arr.length > 0 ? arr : fallback;
  }
  return fallback;
}

export default async function AccessoSvenditaGtvPage() {
  const loaded = await loadConfig();
  const config = loaded ?? {
    heroTitle: DEFAULTS.heroTitle,
    heroSubtitle: DEFAULTS.heroSubtitle,
    bannerImage: "",
    buttonLabel: DEFAULTS.buttonLabel,
    privacyLabel: DEFAULTS.privacyLabel,
    formFields: DEFAULT_FORM_FIELDS,
    custom: DEFAULTS,
  };
  const c = config.custom;

  return (
    <div className="font-sans bg-white text-dark">
      {/* ─── Header ─── */}
      <header className="px-6 md:px-10 py-5 md:py-6 flex items-center justify-between">
        <Link href="/" className="text-[13px] md:text-[14px] font-medium tracking-[0.18em] uppercase text-dark hover:opacity-70 transition-opacity">
          Gebr&uuml;der Thonet Vienna
        </Link>
        <nav className="hidden sm:flex items-center gap-7 text-[11px] md:text-[12px] font-semibold tracking-[0.14em] uppercase">
          <span className="text-dark border-b-2 border-dark pb-1">{c.navLabelActive}</span>
          <Link href="/contatti" className="text-warm-600 hover:text-dark transition-colors">{c.navLabelShowroom}</Link>
          <Link href="/contatti" className="text-warm-600 hover:text-dark transition-colors">{c.navLabelContatti}</Link>
        </nav>
      </header>

      {/* ─── Banner ─── */}
      <section>
        <div className="relative w-full aspect-[24/5] bg-warm-100/70 border-y border-warm-200 overflow-hidden">
          {config.bannerImage ? (
            <Image
              src={config.bannerImage}
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
              {config.heroTitle}
            </h1>
            <p className="text-[15px] md:text-[16px] text-warm-700 leading-[1.6] mb-10 max-w-[480px] whitespace-pre-line">
              {config.heroSubtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-7 gap-x-8 mb-10 max-w-[520px]">
              <InfoBlock
                icon={<Globe size={18} strokeWidth={1.6} />}
                title={c.block1Title || DEFAULTS.block1Title}
                lines={pickArr(c.block1Lines, DEFAULTS.block1Lines)}
                highlight={c.block1HighlightStrong ? [c.block1HighlightPrefix || "", c.block1HighlightStrong] : undefined}
              />
              <InfoBlock
                icon={<MapPin size={18} strokeWidth={1.6} />}
                title={c.block2Title || DEFAULTS.block2Title}
                lines={pickArr(c.block2Lines, DEFAULTS.block2Lines)}
                highlight={c.block2HighlightStrong ? [c.block2HighlightPrefix || "", c.block2HighlightStrong] : undefined}
              />
              <InfoBlock
                icon={<Calendar size={18} strokeWidth={1.6} />}
                title={c.block3Title || DEFAULTS.block3Title}
                lines={pickArr(c.block3Lines, DEFAULTS.block3Lines)}
              />
            </div>

            {/* Long description (markdown subset) */}
            <div className="text-[14px] md:text-[14.5px] text-warm-700 leading-[1.7] max-w-[520px]
              [&_p]:mb-3 [&_p:last-child]:mb-0
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1.5 [&_ul]:marker:text-warm-400
              [&_strong]:font-semibold [&_strong]:text-dark"
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(c.longDescription || DEFAULTS.longDescription) }}
            />
          </div>

          <div className="md:pt-2">
            <div className="md:sticky md:top-8">
              <Suspense fallback={<div className="bg-warm-50/40 border border-warm-200 rounded-sm p-7 md:p-9 h-[400px]" />}>
                <SubscribeForm
                  buttonLabel={config.buttonLabel}
                  privacyLabel={config.privacyLabel}
                  fields={config.formFields}
                  cardTitle={c.formCardTitle}
                  cardSubtitle={c.formCardSubtitle}
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

/** Minimal markdown subset: `**bold**`, `- list item`, paragraphs */
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
