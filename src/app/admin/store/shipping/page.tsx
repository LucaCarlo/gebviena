"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save, Check, AlertCircle, Info, RotateCcw, Database, Upload } from "lucide-react";

interface Settings {
  freeThresholdCents: number;
  itFallbackCents: number;
  frStandardPerM3Cents: number;
  frCorsicaPerM3Cents: number;
  floorDeliveryItPerM3Cents: number;
  floorDeliveryFrPerM3Cents: number;
  unboxingPerM3Cents: number;
  rowPerBoxCents: number;
}

interface Region {
  code: string;
  label: string;
  rateCents: number;
  sortOrder: number;
}

interface Config {
  settings: Settings;
  regions: Region[];
}

// Helpers EUR <-> cents
const centsToEur = (c: number): string => (c / 100).toFixed(2);
const eurToCents = (s: string): number => {
  const v = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
};

export default function StoreShippingPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [countries, setCountries] = useState<Array<{ countryCode: string; name: string; regions: number; provinces: number; cities: number }>>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store/shipping-config");
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setDirty(false);
      } else {
        showToast(data.error || "Errore caricamento configurazione", false);
      }
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const fetchCountries = useCallback(async () => {
    try {
      const res = await fetch("/api/store/geo/countries");
      const data = await res.json();
      if (data.success) setCountries(data.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch {
        showToast("File JSON non valido", false);
        return;
      }
      const res = await fetch("/api/store/geo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.countryName || data.countryCode}: ${data.citiesInserted} città inserite (totale ${data.totalCitiesInDb})`, true);
        await fetchCountries();
      } else {
        showToast(data.error || "Errore durante l'import", false);
      }
    } catch {
      showToast("Errore di rete o file troppo grande", false);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateSetting = (key: keyof Settings, eurValue: string) => {
    if (!config) return;
    setConfig({ ...config, settings: { ...config.settings, [key]: eurToCents(eurValue) } });
    setDirty(true);
  };

  const updateRegionRate = (code: string, eurValue: string) => {
    if (!config) return;
    setConfig({
      ...config,
      regions: config.regions.map((r) => r.code === code ? { ...r, rateCents: eurToCents(eurValue) } : r),
    });
    setDirty(true);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/store/shipping-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: config.settings,
          regions: config.regions.map((r) => ({ code: r.code, label: r.label, rateCents: r.rateCents })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Configurazione salvata", true);
        setDirty(false);
      } else {
        showToast(data.error || "Errore salvataggio", false);
      }
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-warm-900">Spedizioni</h1>
          <p className="text-sm text-warm-500 mt-1">
            Tutti i costi di spedizione del checkout. Le modifiche sono attive entro pochi secondi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-warm-600 border border-warm-200 rounded hover:bg-warm-50 disabled:opacity-50"
            title="Ricarica dal server (scarta modifiche non salvate)"
          >
            <RotateCcw size={14} /> Ricarica
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-warm-900 text-white rounded hover:bg-black disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salva
          </button>
        </div>
      </header>

      {/* Soglia + fallback IT */}
      <section className="bg-white rounded-lg border border-warm-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Soglie generali</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EurField
            label="Spedizione standard GRATUITA sopra"
            help="Sopra questa soglia di subtotale, la spedizione standard è azzerata. I servizi aggiuntivi (piano, disimballo) restano comunque fatturati."
            value={config.settings.freeThresholdCents}
            onChange={(v) => updateSetting("freeThresholdCents", v)}
            suffix="€"
          />
          <EurField
            label="Fallback IT (indirizzo non riconosciuto)"
            help="Prezzo applicato se né la provincia né il CAP corrispondono a nessuna regione. Conviene tenerlo alto (= Sicilia/Sardegna) per non sottostimare."
            value={config.settings.itFallbackCents}
            onChange={(v) => updateSetting("itFallbackCents", v)}
            suffix="€"
          />
        </div>
      </section>

      {/* Italia — 20 regioni */}
      <section className="bg-white rounded-lg border border-warm-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Italia — tariffa flat per regione</h2>
          <span className="text-[11px] text-warm-500 inline-flex items-center gap-1">
            <Info size={12} /> Lookup via provincia, fallback CAP 2 cifre
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-50 text-warm-500 text-xs">
            <tr>
              <th className="px-5 py-2 text-left">Regione</th>
              <th className="px-5 py-2 text-right w-48">Tariffa (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {config.regions.map((r) => (
              <tr key={r.code}>
                <td className="px-5 py-2.5 text-warm-800">{r.label}</td>
                <td className="px-5 py-1.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={centsToEur(r.rateCents)}
                    onChange={(e) => updateRegionRate(r.code, e.target.value)}
                    className="w-32 text-right border border-warm-200 rounded px-2 py-1 text-sm focus:border-warm-700 outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Francia */}
      <section className="bg-white rounded-lg border border-warm-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Francia — al m³</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EurField
            label="Francia continentale"
            help="Tariffa al m³ fatturabile (arrotondato all'm³ superiore, minimo 1m³)."
            value={config.settings.frStandardPerM3Cents}
            onChange={(v) => updateSetting("frStandardPerM3Cents", v)}
            suffix="€/m³"
          />
          <EurField
            label="Corsica (CAP che inizia con 20)"
            help="Tariffa applicata se il CAP francese inizia con &quot;20&quot;."
            value={config.settings.frCorsicaPerM3Cents}
            onChange={(v) => updateSetting("frCorsicaPerM3Cents", v)}
            suffix="€/m³"
          />
        </div>
      </section>

      {/* Servizi aggiuntivi */}
      <section className="bg-white rounded-lg border border-warm-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Servizi aggiuntivi (additivi alla standard)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EurField
            label="Consegna al piano — Italia"
            help="Per ogni m³ fatturabile, se il cliente sceglie consegna a un piano ≥1."
            value={config.settings.floorDeliveryItPerM3Cents}
            onChange={(v) => updateSetting("floorDeliveryItPerM3Cents", v)}
            suffix="€/m³"
          />
          <EurField
            label="Consegna al piano — Francia"
            help="Per ogni m³ fatturabile, se il cliente sceglie consegna a un piano ≥1."
            value={config.settings.floorDeliveryFrPerM3Cents}
            onChange={(v) => updateSetting("floorDeliveryFrPerM3Cents", v)}
            suffix="€/m³"
          />
          <EurField
            label="Disimballo + smaltimento"
            help="Per ogni m³ fatturabile, se il cliente lo seleziona."
            value={config.settings.unboxingPerM3Cents}
            onChange={(v) => updateSetting("unboxingPerM3Cents", v)}
            suffix="€/m³"
          />
        </div>
      </section>

      {/* Resto del mondo */}
      <section className="bg-white rounded-lg border border-warm-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Resto del mondo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EurField
            label="Tariffa per scatola"
            help="Stima grezza per spedizioni in paesi diversi da IT e FR."
            value={config.settings.rowPerBoxCents}
            onChange={(v) => updateSetting("rowPerBoxCents", v)}
            suffix="€/scatola"
          />
        </div>
      </section>

      {/* Database geografici — aggiunta nazioni via upload JSON */}
      <section className="bg-white rounded-lg border border-warm-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider inline-flex items-center gap-2">
              <Database size={15} /> Database geografici
            </h2>
            <p className="text-xs text-warm-600 mt-1">
              Nazioni il cui dataset (regioni, province, città con CAP) è caricato. Vengono usate per i dropdown a cascata del checkout.
            </p>
          </div>
        </div>

        {countries.length > 0 && (
          <div className="border border-warm-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-warm-500 text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Nazione</th>
                  <th className="px-4 py-2 text-right">Regioni</th>
                  <th className="px-4 py-2 text-right">Province</th>
                  <th className="px-4 py-2 text-right">Città</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {countries.map((c) => (
                  <tr key={c.countryCode}>
                    <td className="px-4 py-2.5 text-warm-800">
                      <span className="font-mono text-warm-500 mr-2">{c.countryCode}</span> {c.name}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-warm-700">{c.regions}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-warm-700">{c.provinces}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-warm-700">{c.cities.toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border border-dashed border-warm-300 rounded p-4 space-y-3">
          <div className="text-xs font-semibold text-warm-700 inline-flex items-center gap-2">
            <Upload size={13} /> Carica una nuova nazione (file JSON)
          </div>
          <p className="text-[11px] text-warm-500 leading-relaxed">
            Formato richiesto: un file JSON con la struttura
            <code className="ml-1 px-1 py-0.5 bg-warm-50 rounded">{`{ "countryCode": "DE", "countryName": "Germania", "regions": [{"code","name"}], "provinces": [{"code","name","regionCode"}], "cities": [{"code","name","provinceCode","caps":[]}] }`}</code>.
            L&apos;import è idempotente (rieseguibile, non duplica). Per re-importare con dati aggiornati, prima cancella i record DB della nazione.
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
              }}
              className="block w-full max-w-md text-xs text-warm-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-warm-100 file:text-warm-800 file:cursor-pointer hover:file:bg-warm-200 disabled:opacity-50"
            />
            {importing && (
              <span className="text-xs text-warm-500 inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Import in corso (può richiedere alcuni minuti per dataset grandi)…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Bottom save bar (sticky-ish) */}
      <div className="flex items-center justify-end gap-2 pt-2 pb-6">
        {dirty && (
          <span className="text-xs text-amber-700 inline-flex items-center gap-1 mr-2">
            <AlertCircle size={13} /> Modifiche non salvate
          </span>
        )}
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm bg-warm-900 text-white rounded hover:bg-black disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salva configurazione
        </button>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 z-50 ${
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

function EurField({
  label,
  help,
  value,
  onChange,
  suffix,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (eurValue: string) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-warm-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min={0}
          value={centsToEur(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-right border border-warm-200 rounded px-3 py-2 text-sm focus:border-warm-700 outline-none pr-16"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-warm-500 pointer-events-none">
          {suffix}
        </span>
      </div>
      {help && <p className="text-[11px] text-warm-500 mt-1">{help}</p>}
    </div>
  );
}
