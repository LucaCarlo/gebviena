"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, Check, AlertCircle, Lock, Eye, EyeOff, CreditCard, Mail, Settings as SettingsIcon, PowerOff, Megaphone, BarChart3, Search, ShoppingCart, ArrowDownUp, Pencil, X as XIcon } from "lucide-react";
import SortingTab from "./SortingTab";

type Group =
  | "store_general"
  | "store_stripe"
  | "store_smtp"
  | "store_analytics"
  | "store_seo"
  | "store_sorting"
  | "store_abandoned"
  | "store_sale_banner"
  | "store_maintenance";

type SettingDef = {
  key: string;
  group: Group;
  label: string;
  placeholder?: string;
  secret?: boolean;
  type?: "text" | "number" | "email" | "boolean" | "date" | "datetime-local" | "textarea";
  hint?: string;
};

const DEFINITIONS: SettingDef[] = [
  // ── Generale ──
  {
    key: "store.currency",
    group: "store_general",
    label: "Valuta",
    placeholder: "EUR",
    hint: "Codice ISO 4217 (es. EUR, USD).",
  },
  {
    key: "store.default_country",
    group: "store_general",
    label: "Paese predefinito",
    placeholder: "IT",
    hint: "Codice ISO 3166-1 alpha-2.",
  },
  // Nota: le aliquote IVA per paese sono gestite dinamicamente dal componente
  // (un campo per ciascun paese spedibile + "Resto del mondo"), e i tempi di
  // consegna sono ora nella pagina Spedizioni. Vedi `taxRates` state.

  // ── Stripe ──
  {
    key: "store.stripe.mode",
    group: "store_stripe",
    label: "Modalità Stripe",
    placeholder: "test",
    hint: "Usa 'test' durante lo sviluppo, 'live' in produzione.",
  },
  {
    key: "store.stripe.publishable_key",
    group: "store_stripe",
    label: "Publishable key",
    placeholder: "pk_test_...",
    hint: "Chiave pubblica (lato frontend). Inizia con pk_test_ o pk_live_.",
  },
  {
    key: "store.stripe.secret_key",
    group: "store_stripe",
    label: "Secret key",
    placeholder: "sk_test_...",
    secret: true,
    hint: "Chiave privata (lato server). Mai esporla.",
  },
  {
    key: "store.stripe.webhook_secret",
    group: "store_stripe",
    label: "Webhook signing secret",
    placeholder: "whsec_...",
    secret: true,
    hint: "Usato per verificare i webhook Stripe. Prendilo dalla dashboard Stripe.",
  },

  // ── SMTP (allineato al sito principale; vuoto = fallback al sito) ──
  {
    key: "store.smtp_host",
    group: "store_smtp",
    label: "Host SMTP",
    placeholder: "smtp.mailchannels.net",
    hint: "Server SMTP per le email transazionali store. Se vuoto, lo store usa la configurazione SMTP del sito principale (Impostazioni → SMTP).",
  },
  {
    key: "store.smtp_port",
    group: "store_smtp",
    label: "Porta SMTP",
    type: "number",
    placeholder: "465",
    hint: "Tipico: 465 (SSL), 587 (STARTTLS), 25.",
  },
  {
    key: "store.smtp_secure",
    group: "store_smtp",
    label: "Connessione sicura (SSL/TLS)",
    type: "boolean",
    hint: "Tipicamente attiva per porta 465.",
  },
  {
    key: "store.smtp_user",
    group: "store_smtp",
    label: "Utente SMTP",
    placeholder: "user@mailchannels.net",
  },
  {
    key: "store.smtp_pass",
    group: "store_smtp",
    label: "Password SMTP",
    secret: true,
  },
  {
    key: "store.smtp_from_name",
    group: "store_smtp",
    label: "Mittente — Nome",
    placeholder: "Gebrüder Thonet Vienna",
  },
  {
    key: "store.smtp_from_email",
    group: "store_smtp",
    label: "Mittente — Indirizzo",
    type: "email",
    placeholder: "shop@gebruederthonetvienna.com",
    hint: "Indirizzo del mittente delle email transazionali (conferma ordine, ecc.).",
  },
  {
    key: "store.admin_email",
    group: "store_smtp",
    label: "Email amministratore (notifiche nuovi ordini)",
    type: "email",
    placeholder: "admin@gebruederthonetvienna.com",
  },
  {
    key: "store.brevo_api_key",
    group: "store_smtp",
    label: "Brevo API key (opzionale)",
    secret: true,
    hint: "Se configurata, le email vengono inviate via API Brevo invece che via SMTP. Sovrascrive i campi qui sopra.",
  },

  // ── Analytics ──
  {
    key: "store.fb_pixel_id",
    group: "store_analytics",
    label: "Meta / Facebook Pixel ID",
    placeholder: "1358148166154402",
    hint: "ID del pixel Meta usato per le campagne sponsorizzate. Solo il numero. Lascia vuoto per disattivare il tracciamento Facebook.",
  },
  {
    key: "store.fb_capi_access_token",
    group: "store_analytics",
    label: "Meta CAPI — Access Token (server-side)",
    placeholder: "EAAB...",
    secret: true,
    hint: "Access token per la Conversions API. Generalo da Events Manager → Impostazioni → Conversions API. Permette di inviare eventi server-side anche se il browser blocca il pixel.",
  },
  {
    key: "store.fb_capi_test_event_code",
    group: "store_analytics",
    label: "Meta CAPI — Test Event Code (opzionale)",
    placeholder: "TEST12345",
    hint: "Solo per debug. Codice dalla scheda Test Events di Meta. Lascia vuoto in produzione.",
  },

  // ── SEO ──
  {
    key: "store.seo.title",
    group: "store_seo",
    label: "Meta title default",
    placeholder: "Store — Gebrüder Thonet Vienna",
    hint: "Titolo predefinito mostrato nei risultati Google e nel tab del browser per le pagine dello store senza un title proprio.",
  },
  {
    key: "store.seo.description",
    group: "store_seo",
    label: "Meta description default",
    type: "textarea",
    placeholder: "Acquista online sedute, tavoli e complementi Gebrüder Thonet Vienna.",
    hint: "Descrizione predefinita (~155 caratteri max) usata da Google e dalle condivisioni social.",
  },
  {
    key: "store.seo.og_image",
    group: "store_seo",
    label: "Immagine social Open Graph (URL)",
    placeholder: "https://gebruederthonetvienna.com/og-store.jpg",
    hint: "URL completo dell'immagine usata quando un link dello store viene condiviso su Facebook/WhatsApp/X. Consigliata: 1200×630 px, ≤5 MB.",
  },
  {
    key: "store.seo.google_site_verification",
    group: "store_seo",
    label: "Google Search Console — codice verifica",
    placeholder: "abc123…",
    hint: "Solo il valore del meta tag google-site-verification (senza tag HTML). Per verificare la proprietà del dominio in Search Console.",
  },

  // ── Carrelli abbandonati ──
  {
    key: "abandoned_cart_ttl_days",
    group: "store_abandoned",
    label: "Auto-cancellazione carrello (giorni)",
    type: "number",
    placeholder: "90",
    hint: "Dopo quanti giorni i carrelli abbandonati vengono cancellati automaticamente dal database. Default 90. Imposta 0 per disabilitare la pulizia.",
  },
  {
    key: "abandoned_cart.reminders_enabled",
    group: "store_abandoned",
    label: "Invio email di recupero automatiche",
    type: "boolean",
    hint: "Quando attivo, ai clienti che hanno abbandonato il checkout (e lasciato email) parte automaticamente una sequenza di promemoria.",
  },
  {
    key: "abandoned_cart.reminder_1_hours",
    group: "store_abandoned",
    label: "Primo promemoria — ore dopo l'abbandono",
    type: "number",
    placeholder: "2",
    hint: "Dopo quante ore dall'ultima attività nel checkout parte il primo promemoria. Default 2 ore (cattura clienti distratti). Imposta 0 per disattivare il primo.",
  },
  {
    key: "abandoned_cart.reminder_2_hours",
    group: "store_abandoned",
    label: "Secondo promemoria — ore dopo l'abbandono",
    type: "number",
    placeholder: "24",
    hint: "Default 24 ore. Promemoria \"completa il tuo ordine\". 0 = disattivato.",
  },
  {
    key: "abandoned_cart.reminder_3_hours",
    group: "store_abandoned",
    label: "Terzo promemoria — ore dopo l'abbandono",
    type: "number",
    placeholder: "72",
    hint: "Default 72 ore (3 giorni). Ultimo tentativo, di solito con coupon recupero. 0 = disattivato.",
  },
  {
    key: "abandoned_cart.min_subtotal_cents",
    group: "store_abandoned",
    label: "Soglia minima subtotale per inviare i promemoria (centesimi)",
    type: "number",
    placeholder: "0",
    hint: "Sotto questo subtotale carrello, i promemoria non vengono inviati. Valore in centesimi (es. 5000 = 50 €). Imposta 0 per inviare sempre.",
  },
  {
    key: "abandoned_cart.recovery_coupon",
    group: "store_abandoned",
    label: "Codice coupon per il terzo promemoria (opzionale)",
    placeholder: "RECUPERO10",
    hint: "Se valorizzato, viene incluso nell'email del terzo promemoria come ultimo incentivo. Il codice deve esistere nella sezione Coupon.",
  },

  // ── Banner svendita ──
  {
    key: "store.sale_banner.enabled",
    group: "store_sale_banner",
    label: "Banner svendita attivo",
    type: "boolean",
    hint: "Quando attivo, sotto al menu dello store appare una barra nera con messaggio + countdown alla data di fine.",
  },
  {
    key: "store.sale_banner.message_it",
    group: "store_sale_banner",
    label: "Messaggio (IT)",
    placeholder: "Merce in svendita limitata",
  },
  {
    key: "store.sale_banner.message_fr",
    group: "store_sale_banner",
    label: "Messaggio (FR)",
    placeholder: "Marchandise en vente limitée",
  },
  {
    key: "store.sale_banner.countdown_prefix_it",
    group: "store_sale_banner",
    label: "Testo prima del countdown (IT)",
    placeholder: "La vendita speciale si chiuderà tra:",
    hint: "Frase che appare prima del countdown (es. 02 g · 14 h · 23 m). Lascia vuoto per nasconderlo.",
  },
  {
    key: "store.sale_banner.countdown_prefix_fr",
    group: "store_sale_banner",
    label: "Testo prima del countdown (FR)",
    placeholder: "La vente spéciale se termine dans:",
  },
  {
    key: "store.sale_banner.end_date",
    group: "store_sale_banner",
    label: "Data e ora di fine svendita",
    type: "datetime-local",
    placeholder: "2026-06-30T23:59",
    hint: "Il countdown si aggiorna verso questa data. Superata, il banner si nasconde automaticamente.",
  },

  // ── Apertura e chiusura store ──
  {
    key: "store.maintenance.enabled",
    group: "store_maintenance",
    label: "Forza chiusura manuale (subito)",
    type: "boolean",
    hint: "Quando attivo, lo store è subito chiuso e mostra la pagina di attesa a tutti. L'admin (/admin) resta accessibile. Le date di chiusura/apertura programmate qui sotto hanno priorità su questo flag.",
  },
  {
    key: "store.maintenance.closing_date",
    group: "store_maintenance",
    label: "Data e ora di chiusura automatica",
    type: "datetime-local",
    placeholder: "2026-07-31T20:00",
    hint: "Da questa data lo store si chiude automaticamente. Lascia vuoto per gestione manuale.",
  },
  {
    key: "store.maintenance.opening_date",
    group: "store_maintenance",
    label: "Data e ora di apertura automatica",
    type: "datetime-local",
    placeholder: "2026-09-01T09:00",
    hint: "Da questa data lo store si riapre automaticamente (annulla sia la chiusura programmata che il flag manuale). Lascia vuoto per gestione manuale.",
  },
  {
    key: "store.maintenance.title",
    group: "store_maintenance",
    label: "Titolo pagina di chiusura",
    placeholder: "Stiamo arrivando",
  },
  {
    key: "store.maintenance.message",
    group: "store_maintenance",
    label: "Messaggio della pagina di chiusura",
    type: "textarea",
    placeholder: "Lo store online sarà disponibile a breve. Resta aggiornato.",
  },
];

const GROUP_META: Record<Group, { title: string; subtitle: string; icon: typeof CreditCard }> = {
  store_general: {
    title: "Generale",
    subtitle: "Valuta, paese predefinito e aliquote IVA per ciascun paese spedibile",
    icon: SettingsIcon,
  },
  store_stripe: {
    title: "Stripe — pagamenti",
    subtitle: "Chiavi API e webhook per gestire i pagamenti carta",
    icon: CreditCard,
  },
  store_smtp: {
    title: "SMTP",
    subtitle: "Configurazione server email per le transazionali. Se vuoto → fallback all'SMTP del sito principale.",
    icon: Mail,
  },
  store_analytics: {
    title: "Analytics",
    subtitle: "Meta Pixel e Conversions API per il tracciamento campagne",
    icon: BarChart3,
  },
  store_seo: {
    title: "SEO",
    subtitle: "Meta tag default, Open Graph, Search Console",
    icon: Search,
  },
  store_sorting: {
    title: "Ordinamento",
    subtitle: "Come sono ordinati i prodotti nella vetrina, e quali pinnare in cima",
    icon: ArrowDownUp,
  },
  store_abandoned: {
    title: "Carrelli abbandonati",
    subtitle: "Pulizia automatica e sequenza email di recupero per i checkout abbandonati",
    icon: ShoppingCart,
  },
  store_sale_banner: {
    title: "Banner svendita",
    subtitle: "Barra in cima allo store con messaggio e countdown",
    icon: Megaphone,
  },
  store_maintenance: {
    title: "Apertura e chiusura",
    subtitle: "Programma quando lo store apre o chiude (con countdown alla riapertura sulla pagina di attesa).",
    icon: PowerOff,
  },
};

const TAB_ORDER: Group[] = [
  "store_general",
  "store_stripe",
  "store_smtp",
  "store_analytics",
  "store_seo",
  "store_sorting",
  "store_abandoned",
  "store_sale_banner",
  "store_maintenance",
];

// Strategie e modalità random — devono restare allineate con SortingTab.tsx e
// con l'API /api/store/public/products.
type SortStrategy = "newest" | "oldest" | "name-asc" | "name-desc" | "price-asc" | "price-desc" | "manual" | "random";
type SortRandomMode = "per-request" | "per-session";
interface SortingValues {
  strategy: SortStrategy;
  randomMode: SortRandomMode;
  pinnedIds: string[];
  allowUserOverride: boolean;
}
const SORTING_DEFAULTS: SortingValues = {
  strategy: "newest",
  randomMode: "per-request",
  pinnedIds: [],
  allowUserOverride: true,
};

// Per IVA: l'utente inserisce la percentuale (es. "22"); internamente la
// convertiamo in basis points. Accetta numeri con decimali (es. "5.5").
function taxRateKey(countryCode: string): string {
  return `store.tax_rate_pct_${countryCode.toLowerCase()}`;
}

export default function StoreSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  // Aliquote IVA dinamiche per paese (codice ISO UPPERCASE → percentuale come stringa).
  const [taxRates, setTaxRates] = useState<Record<string, string>>({});
  // Riga IVA in modifica (codice paese) e valore temporaneo del campo.
  const [editingTaxCode, setEditingTaxCode] = useState<string | null>(null);
  const [editingTaxValue, setEditingTaxValue] = useState<string>("");
  const [savingTax, setSavingTax] = useState(false);
  // Paesi importati (per generare il set di campi IVA + ROW).
  const [countries, setCountries] = useState<Array<{ countryCode: string; name: string }>>([]);
  // Stato isolato per il tab Ordinamento — non passa per il loop DEFINITIONS.
  const [sorting, setSorting] = useState<SortingValues>(SORTING_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Tab attivo sincronizzato con ?tab= nell'URL (deep-link).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as Group | null;
  const initialTab: Group = tabFromUrl && TAB_ORDER.includes(tabFromUrl) ? tabFromUrl : "store_general";
  const [activeTab, setActiveTab] = useState<Group>(initialTab);
  useEffect(() => {
    const t = searchParams.get("tab") as Group | null;
    const next: Group = t && TAB_ORDER.includes(t) ? t : "store_general";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const switchTab = useCallback((t: Group) => {
    setActiveTab(t);
    router.replace(`${pathname}?tab=${t}`, { scroll: false });
  }, [router, pathname]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [settingsRes, countriesRes] = await Promise.all([
      fetch("/api/store/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/store/geo/countries").then((r) => r.json()).catch(() => null),
    ]);
    if (settingsRes?.success) {
      const next: Record<string, string> = {};
      for (const def of DEFINITIONS) {
        next[def.key] = settingsRes.data[def.key]?.value ?? "";
      }
      // Estrae le aliquote IVA da tutti i setting store.tax_rate_pct_*
      const taxNext: Record<string, string> = {};
      for (const k of Object.keys(settingsRes.data || {})) {
        const m = k.match(/^store\.tax_rate_pct_([a-z]+)$/);
        if (m) taxNext[m[1].toUpperCase()] = settingsRes.data[k]?.value ?? "";
      }
      // Carica il sub-state dell'ordinamento (separato dal DEFINITIONS loop).
      const strategyRaw = settingsRes.data["store.sort.strategy"]?.value ?? "newest";
      const allowedStrategies: SortStrategy[] = ["newest", "oldest", "name-asc", "name-desc", "price-asc", "price-desc", "manual", "random"];
      const strategy: SortStrategy = allowedStrategies.includes(strategyRaw as SortStrategy) ? (strategyRaw as SortStrategy) : "newest";
      const randomMode: SortRandomMode = (settingsRes.data["store.sort.random_mode"]?.value ?? "per-request") === "per-session" ? "per-session" : "per-request";
      let pinnedIds: string[] = [];
      try {
        const raw = settingsRes.data["store.sort.pinned_ids"]?.value || "[]";
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) pinnedIds = parsed.filter((x): x is string => typeof x === "string");
      } catch { /* ignore */ }
      const allowUserOverride = (settingsRes.data["store.sort.allow_user_override"]?.value ?? "true") !== "false";
      setSorting({ strategy, randomMode, pinnedIds, allowUserOverride });
      setValues(next);
      setTaxRates(taxNext);
    }
    if (countriesRes?.success) {
      setCountries((countriesRes.data || []).map((c: { countryCode: string; name: string }) => ({
        countryCode: c.countryCode,
        name: c.name,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Lista paesi per cui mostriamo un campo IVA: SOLO countries importati
  // (Italia, Francia, ecc.). Il fallback "Resto del mondo" non viene mostrato
  // perché il checkout permette di selezionare solo paesi importati — un'IVA
  // ROW non verrebbe mai applicata.
  const taxCountriesList: { code: string; label: string }[] = (() => {
    const seen = new Set<string>();
    const items: { code: string; label: string }[] = [];
    for (const c of countries) {
      const cc = c.countryCode.toUpperCase();
      if (cc === "ROW" || seen.has(cc)) continue;
      seen.add(cc);
      items.push({ code: cc, label: c.name });
    }
    // Aggiungo anche eventuali codici già presenti in taxRates ma non in countries
    // (es. setting esistenti da prima dell'import — non perdiamo dati).
    for (const cc of Object.keys(taxRates)) {
      if (cc !== "ROW" && !seen.has(cc)) {
        seen.add(cc);
        items.push({ code: cc, label: cc });
      }
    }
    return items;
  })();

  // Inline edit di una singola aliquota IVA: apre il campo, conferma su API.
  const startEditTax = (code: string) => {
    const current = (taxRates[code] ?? "").toString();
    // Se mai impostata prima (paese appena importato), default 20% (non 0)
    setEditingTaxValue(current === "" ? "20" : current);
    setEditingTaxCode(code);
  };
  const cancelEditTax = () => {
    setEditingTaxCode(null);
    setEditingTaxValue("");
  };
  const confirmEditTax = async () => {
    if (!editingTaxCode) return;
    const raw = editingTaxValue.toString().trim().replace(",", ".");
    const n = parseFloat(raw);
    // Default 20% per evitare di salvare per sbaglio 0% (no IVA)
    const normalized = Number.isFinite(n) && n >= 0 ? String(n) : "20";
    setSavingTax(true);
    try {
      const res = await fetch("/api/store/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [{ key: taxRateKey(editingTaxCode), group: "store_general", value: normalized }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTaxRates((t) => ({ ...t, [editingTaxCode]: normalized }));
        showToast(`Aliquota ${editingTaxCode} aggiornata a ${normalized}%`, true);
        cancelEditTax();
      } else {
        showToast(data.error || "Errore aggiornamento aliquota", false);
      }
    } catch {
      showToast("Errore di connessione", false);
    } finally {
      setSavingTax(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const settings: Array<{ key: string; group: string; value: string }> = DEFINITIONS.map((d) => ({
        key: d.key,
        group: d.group,
        value: values[d.key] ?? "",
      }));
      // Aggiungo le aliquote IVA dinamiche (group=store_general). Accetto
      // solo numeri non negativi; stringa vuota / non valida → default 20%
      // (evitiamo di salvare 0% per sbaglio dopo l'import di una nazione).
      for (const cc of Object.keys(taxRates)) {
        const raw = (taxRates[cc] ?? "").toString().trim().replace(",", ".");
        const n = parseFloat(raw);
        const normalized = Number.isFinite(n) && n >= 0 ? String(n) : "20";
        settings.push({ key: taxRateKey(cc), group: "store_general", value: normalized });
      }
      // Sotto-state ordinamento: 4 chiavi nel group store_sorting.
      settings.push({ key: "store.sort.strategy",            group: "store_sorting", value: sorting.strategy });
      settings.push({ key: "store.sort.random_mode",         group: "store_sorting", value: sorting.randomMode });
      settings.push({ key: "store.sort.pinned_ids",          group: "store_sorting", value: JSON.stringify(sorting.pinnedIds) });
      settings.push({ key: "store.sort.allow_user_override", group: "store_sorting", value: sorting.allowUserOverride ? "true" : "false" });
      const res = await fetch("/api/store/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) showToast("Impostazioni salvate", true);
      else showToast(data.error || "Errore", false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  const activeMeta = GROUP_META[activeTab];
  const ActiveIcon = activeMeta.icon;
  const activeDefs = DEFINITIONS.filter((d) => d.group === activeTab);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900">Impostazioni Store</h1>
        <p className="text-sm text-warm-500 mt-1">
          Configurazione del modulo e-commerce (Stripe, tasse, email, banner, apertura e chiusura).
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Vertical tabs (desktop) / Horizontal pills (mobile) */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {TAB_ORDER.map((g) => {
              const meta = GROUP_META[g];
              const Icon = meta.icon;
              const isActive = activeTab === g;
              return (
                <button
                  key={g}
                  onClick={() => switchTab(g)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-warm-800 text-white"
                      : "text-warm-600 hover:bg-warm-100 hover:text-warm-800"
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{meta.title}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <section className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-warm-200 bg-warm-50/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warm-900 text-white flex items-center justify-center">
                <ActiveIcon size={16} />
              </div>
              <div>
                <div className="font-medium text-warm-900">{activeMeta.title}</div>
                <div className="text-xs text-warm-500">{activeMeta.subtitle}</div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {activeTab === "store_sorting" && (
                <SortingTab values={sorting} onChange={setSorting} />
              )}
              {activeTab === "store_general" && (
                <div className="border border-warm-200 rounded-lg p-4 bg-warm-50/30 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-warm-800 flex items-center gap-2">
                      <Lock size={14} className="text-warm-500" /> Aliquote IVA per paese
                    </div>
                    <div className="text-xs text-warm-500 mt-0.5">
                      Dato sensibile: per modificare un&apos;aliquota usa il tasto <span className="font-medium">Modifica</span>
                      sulla riga e conferma. Aggiungi un paese dalla pagina <a href="/admin/store/shipping" className="underline">Spedizioni</a> per farne apparire qui l&apos;IVA: l&apos;aliquota di default è <span className="font-medium">20%</span> finché non la modifichi.
                    </div>
                  </div>
                  {taxCountriesList.length === 0 ? (
                    <div className="text-sm text-warm-500 py-3">
                      Nessun paese importato. Aggiungi un paese dalla pagina <a href="/admin/store/shipping" className="underline">Spedizioni</a>.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white border border-warm-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="text-left px-4 py-2">Paese</th>
                            <th className="text-left px-4 py-2 w-40">Aliquota</th>
                            <th className="text-right px-4 py-2 w-44">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-100">
                          {taxCountriesList.map((it) => {
                            const isEditing = editingTaxCode === it.code;
                            const current = taxRates[it.code];
                            const display = current === undefined || current === "" ? null : current;
                            return (
                              <tr key={it.code} className={isEditing ? "bg-amber-50/40" : ""}>
                                <td className="px-4 py-2.5 text-warm-800">
                                  <span className="font-medium">{it.label}</span>
                                  <span className="text-warm-400 text-xs ml-1.5">({it.code})</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  {isEditing ? (
                                    <div className="relative w-28">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        autoFocus
                                        value={editingTaxValue}
                                        onChange={(e) => setEditingTaxValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); confirmEditTax(); }
                                          if (e.key === "Escape") { e.preventDefault(); cancelEditTax(); }
                                        }}
                                        className="w-full px-2 py-1 pr-7 border border-warm-300 rounded text-sm font-mono focus:outline-none focus:border-warm-800"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-warm-500 pointer-events-none">%</span>
                                    </div>
                                  ) : display !== null ? (
                                    <span className="font-mono text-warm-800">{display}<span className="text-warm-500 ml-1">%</span></span>
                                  ) : (
                                    <span className="text-warm-400 italic text-xs">non impostata (default 20% al primo salvataggio)</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={confirmEditTax}
                                        disabled={savingTax}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-warm-900 text-white text-xs rounded hover:bg-warm-800 disabled:opacity-50"
                                      >
                                        {savingTax ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        Conferma
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditTax}
                                        disabled={savingTax}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-warm-300 text-warm-700 text-xs rounded hover:bg-warm-100 disabled:opacity-50"
                                      >
                                        <XIcon size={12} />
                                        Annulla
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEditTax(it.code)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-warm-300 text-warm-700 text-xs rounded hover:bg-warm-100"
                                    >
                                      <Pencil size={12} />
                                      Modifica
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeDefs.map((def) => {
                const isRevealed = revealed[def.key];
                const v = values[def.key] ?? "";

                if (def.type === "boolean") {
                  const checked = v === "true";
                  return (
                    <div key={def.key}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setValues((vs) => ({ ...vs, [def.key]: checked ? "false" : "true" }))}
                          className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-warm-900" : "bg-warm-300"}`}
                          aria-pressed={checked}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                        <span className="text-sm font-medium text-warm-800">{def.label}</span>
                      </label>
                      {def.hint && <div className="text-xs text-warm-500 mt-2 ml-[52px]">{def.hint}</div>}
                    </div>
                  );
                }

                if (def.type === "textarea") {
                  return (
                    <div key={def.key}>
                      <label className="flex items-center gap-2 text-xs font-medium text-warm-600 mb-1">{def.label}</label>
                      <textarea
                        value={v}
                        onChange={(e) => setValues((vs) => ({ ...vs, [def.key]: e.target.value }))}
                        placeholder={def.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                      />
                      {def.hint && <div className="text-xs text-warm-500 mt-1">{def.hint}</div>}
                    </div>
                  );
                }

                const inputType =
                  def.secret && !isRevealed ? "password" :
                  def.type === "datetime-local" ? "datetime-local" :
                  def.type === "date" ? "date" :
                  def.type === "number" ? "number" :
                  def.type === "email" ? "email" :
                  "text";

                return (
                  <div key={def.key}>
                    <label className="flex items-center gap-2 text-xs font-medium text-warm-600 mb-1">
                      {def.secret && <Lock size={11} className="text-warm-400" />}
                      {def.label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={inputType}
                        value={v}
                        onChange={(e) =>
                          setValues((vs) => ({ ...vs, [def.key]: e.target.value }))
                        }
                        placeholder={def.placeholder}
                        className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
                      />
                      {def.secret && (
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [def.key]: !r[def.key] }))}
                          className="px-3 py-2 bg-warm-100 hover:bg-warm-200 rounded-lg text-warm-600"
                          title={isRevealed ? "Nascondi" : "Mostra"}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    {def.hint && <div className="text-xs text-warm-500 mt-1">{def.hint}</div>}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end mt-6">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={14} />}
              Salva impostazioni
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
            toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
