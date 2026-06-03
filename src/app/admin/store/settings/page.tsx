"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, Lock, Eye, EyeOff, CreditCard, Mail, Settings as SettingsIcon, PowerOff, Megaphone, BarChart3, Search } from "lucide-react";

type Group =
  | "store_general"
  | "store_stripe"
  | "store_smtp"
  | "store_analytics"
  | "store_seo"
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
  {
    key: "store.tax_rate_bp_it",
    group: "store_general",
    label: "IVA Italia (basis points)",
    type: "number",
    placeholder: "2200",
    hint: "2200 = 22% (aliquota standard IT). 1000 basis point = 10%.",
  },
  {
    key: "store.tax_rate_bp_fr",
    group: "store_general",
    label: "IVA Francia (basis points)",
    type: "number",
    placeholder: "2000",
    hint: "2000 = 20% (aliquota standard FR). Applicata agli ordini con paese di spedizione FR.",
  },
  {
    key: "store.delivery_lead_time",
    group: "store_general",
    label: "Tempi di consegna (IT)",
    placeholder: "4–6 settimane",
    hint: "Mostrato sulla pagina prodotto in italiano. Testo libero (es. \"4–6 settimane\", \"Pronta consegna\").",
  },
  {
    key: "store.delivery_lead_time_fr",
    group: "store_general",
    label: "Tempi di consegna (FR)",
    placeholder: "4–6 semaines",
    hint: "Versione francese mostrata quando lo store è in francese.",
  },
  {
    key: "abandoned_cart_ttl_days",
    group: "store_general",
    label: "Carrelli abbandonati — auto-cancellazione (giorni)",
    placeholder: "90",
    hint: "Dopo quanti giorni i carrelli abbandonati vengono cancellati automaticamente. Default 90. Imposta 0 per disabilitare la pulizia.",
  },

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
    key: "store.sale_banner.end_date",
    group: "store_sale_banner",
    label: "Data e ora di fine svendita",
    type: "datetime-local",
    placeholder: "2026-06-30T23:59",
    hint: "Il countdown si aggiorna verso questa data. Superata, il banner si nasconde automaticamente.",
  },

  // ── Modalità offline ──
  {
    key: "store.maintenance.enabled",
    group: "store_maintenance",
    label: "Modalità offline attiva",
    type: "boolean",
    hint: "Quando attiva, lo store mostra una pagina di attesa a tutti i visitatori. L'admin (/admin) resta accessibile.",
  },
  {
    key: "store.maintenance.title",
    group: "store_maintenance",
    label: "Titolo pagina",
    placeholder: "Stiamo arrivando",
  },
  {
    key: "store.maintenance.message",
    group: "store_maintenance",
    label: "Messaggio",
    type: "textarea",
    placeholder: "Lo store online sarà disponibile a breve. Resta aggiornato.",
  },
  {
    key: "store.maintenance.opening_date",
    group: "store_maintenance",
    label: "Data e ora di apertura",
    type: "datetime-local",
    placeholder: "2026-05-15T09:00",
    hint: "Se valorizzata, viene mostrato un countdown alla data esatta. Lascia vuoto per nasconderlo.",
  },
];

const GROUP_META: Record<Group, { title: string; subtitle: string; icon: typeof CreditCard }> = {
  store_general: {
    title: "Generale",
    subtitle: "Valuta, IVA IT/FR, paese predefinito, tempi consegna",
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
  store_sale_banner: {
    title: "Banner svendita",
    subtitle: "Barra in cima allo store con messaggio e countdown",
    icon: Megaphone,
  },
  store_maintenance: {
    title: "Modalità offline",
    subtitle: "Mette lo store in modalità 'arrivo presto' con countdown alla riapertura",
    icon: PowerOff,
  },
};

const TAB_ORDER: Group[] = [
  "store_general",
  "store_stripe",
  "store_smtp",
  "store_analytics",
  "store_seo",
  "store_sale_banner",
  "store_maintenance",
];

export default function StoreSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<Group>("store_general");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/store/settings").then((r) => r.json());
    if (res.success) {
      const next: Record<string, string> = {};
      for (const def of DEFINITIONS) {
        next[def.key] = res.data[def.key]?.value ?? "";
      }
      setValues(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    setSaving(true);
    try {
      const settings = DEFINITIONS.map((d) => ({
        key: d.key,
        group: d.group,
        value: values[d.key] ?? "",
      }));
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
          Configurazione del modulo e-commerce (Stripe, tasse, email, banner, modalità offline).
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
                  onClick={() => setActiveTab(g)}
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
