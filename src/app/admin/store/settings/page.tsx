"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, Lock, Eye, EyeOff, CreditCard, Mail, Settings as SettingsIcon, PowerOff } from "lucide-react";

type Group = "store_stripe" | "store_email" | "store_general" | "store_maintenance";

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

  // ── General ──
  {
    key: "store.currency",
    group: "store_general",
    label: "Valuta",
    placeholder: "EUR",
    hint: "Codice ISO 4217 (es. EUR, USD).",
  },
  {
    key: "store.tax_rate_bp",
    group: "store_general",
    label: "IVA di default (basis points)",
    type: "number",
    placeholder: "2200",
    hint: "2200 = 22%. 1000 basis point = 10%.",
  },
  {
    key: "store.default_country",
    group: "store_general",
    label: "Paese predefinito",
    placeholder: "IT",
    hint: "Codice ISO 3166-1 alpha-2.",
  },
  {
    key: "store.delivery_lead_time",
    group: "store_general",
    label: "Tempi di consegna (IT)",
    placeholder: "4–6 settimane",
    hint: "Mostrato sulla pagina prodotto (lingua italiana). Testo libero (es. \"4–6 settimane\", \"Pronta consegna\", \"Su ordinazione\"). Vale per tutti i prodotti.",
  },
  {
    key: "store.delivery_lead_time_fr",
    group: "store_general",
    label: "Tempi di consegna (FR)",
    placeholder: "4–6 semaines",
    hint: "Versione francese mostrata quando lo store è in francese (es. \"4–6 semaines\", \"Livraison rapide\", \"Sur commande\").",
  },

  // ── Email ──
  {
    key: "store.email.from_name",
    group: "store_email",
    label: "Mittente — Nome",
    placeholder: "Gebrüder Thonet Vienna",
  },
  {
    key: "store.email.from_address",
    group: "store_email",
    label: "Mittente — Indirizzo",
    type: "email",
    placeholder: "shop@gebruederthonetvienna.com",
    hint: "Indirizzo usato per le email transazionali (conferma ordine, ecc.).",
  },
  {
    key: "store.email.admin_notify",
    group: "store_email",
    label: "Notifiche admin",
    type: "email",
    placeholder: "admin@gebruederthonetvienna.com",
    hint: "A questo indirizzo arrivano le notifiche di nuovi ordini.",
  },

  // ── Maintenance / Coming soon ──
  {
    key: "store.maintenance.enabled",
    group: "store_maintenance",
    label: "Modalità offline attiva",
    type: "boolean",
    hint: "Quando attiva, lo store mostra una pagina 'arrivo presto' a tutti i visitatori. L'admin (/admin) resta accessibile.",
  },
  {
    key: "store.maintenance.title",
    group: "store_maintenance",
    label: "Titolo pagina",
    placeholder: "Stiamo arrivando",
    hint: "Mostrato in grande sulla pagina di attesa.",
  },
  {
    key: "store.maintenance.message",
    group: "store_maintenance",
    label: "Messaggio",
    type: "textarea",
    placeholder: "Lo store online sarà disponibile a breve. Resta aggiornato.",
    hint: "Sottotitolo / messaggio mostrato sotto al titolo.",
  },
  {
    key: "store.maintenance.opening_date",
    group: "store_maintenance",
    label: "Data e ora di apertura",
    type: "datetime-local",
    placeholder: "2026-05-15T09:00",
    hint: "Se valorizzata, viene mostrato un countdown alla data/ora esatta. Lascia vuoto per nasconderlo.",
  },
];

const GROUP_META: Record<Group, { title: string; subtitle: string; icon: typeof CreditCard }> = {
  store_stripe: {
    title: "Stripe — pagamenti",
    subtitle: "Chiavi API e webhook per gestire i pagamenti carta",
    icon: CreditCard,
  },
  store_general: {
    title: "Generale",
    subtitle: "Valuta, IVA, paese predefinito",
    icon: SettingsIcon,
  },
  store_email: {
    title: "Email transazionali",
    subtitle: "Mittente e destinatari delle email dello store",
    icon: Mail,
  },
  store_maintenance: {
    title: "Modalità offline (coming soon)",
    subtitle: "Mette lo store in modalità 'arrivo presto' con countdown alla riapertura",
    icon: PowerOff,
  },
};

export default function StoreSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  const groups: Group[] = ["store_maintenance", "store_stripe", "store_general", "store_email"];

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900">Impostazioni Store</h1>
        <p className="text-sm text-warm-500 mt-1">
          Configurazione del modulo e-commerce (Stripe, tasse, email, paese).
        </p>
      </header>

      <div className="space-y-6">
        {groups.map((g) => {
          const meta = GROUP_META[g];
          const defs = DEFINITIONS.filter((d) => d.group === g);
          const Icon = meta.icon;
          return (
            <section key={g} className="bg-white rounded-lg border border-warm-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-warm-200 bg-warm-50/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warm-900 text-white flex items-center justify-center">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="font-medium text-warm-900">{meta.title}</div>
                  <div className="text-xs text-warm-500">{meta.subtitle}</div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {defs.map((def) => {
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
          );
        })}
      </div>

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
