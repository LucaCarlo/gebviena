"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, ChevronDown, Plus, Trash2, Check, X, AlertCircle, Info, Pencil } from "lucide-react";

type Service = "CURBSIDE" | "FLOOR_1_3" | "FLOOR_4_10_MAX6";

const SERVICES: { value: Service; label: string; short: string }[] = [
  { value: "CURBSIDE", label: "Bordo strada", short: "BS" },
  { value: "FLOOR_1_3", label: "Piano 1-3", short: "P1-3" },
  { value: "FLOOR_4_10_MAX6", label: "Piano 4-10 (max 6 m³)", short: "P4-10" },
];

interface Region { code: string; name: string; sortOrder: number; }
interface Province { code: string; name: string; regionCode: string; }
interface City { code: string; name: string; provinceCode: string; }

interface Tariff {
  id: string;
  countryCode: string;
  regionCode: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  service: Service;
  pricePerM3Cents: number;
  minChargeCents: number;
  maxVolumeM3: string | number | null;
  notes: string | null;
  isActive: boolean;
}

type TariffScope =
  | { level: "country"; regionCode: null; provinceCode: null; cityCode: null }
  | { level: "region"; regionCode: string; provinceCode: null; cityCode: null }
  | { level: "province"; regionCode: string; provinceCode: string; cityCode: null }
  | { level: "city"; regionCode: string; provinceCode: string; cityCode: string };

export default function StoreShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<{ scope: TariffScope; label: string } | null>(null);
  const [addCityFor, setAddCityFor] = useState<Province | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/store/shipping?country=IT").then((r) => r.json());
    if (res.success) {
      setRegions(res.data.regions);
      setProvinces(res.data.provinces);
      setCities(res.data.cities);
      setTariffs(res.data.tariffs);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tariffsByScope = useMemo(() => {
    const map = new Map<string, Tariff[]>();
    const key = (t: Tariff) => `${t.regionCode || "*"}:${t.provinceCode || "*"}:${t.cityCode || "*"}`;
    for (const t of tariffs) {
      const k = key(t);
      const list = map.get(k) || [];
      list.push(t);
      map.set(k, list);
    }
    return map;
  }, [tariffs]);

  const getTariffs = (region: string | null, province: string | null, city: string | null) =>
    tariffsByScope.get(`${region || "*"}:${province || "*"}:${city || "*"}`) || [];

  const tariffLabel = (ts: Tariff[]) => {
    if (ts.length === 0) return null;
    const parts: string[] = [];
    for (const s of SERVICES) {
      const t = ts.find((x) => x.service === s.value);
      if (t) parts.push(`${s.short} ${(t.pricePerM3Cents / 100).toFixed(0)}€`);
    }
    return parts.join(" · ");
  };

  // resolve cascade tariffs (what's actually in effect for a node)
  const resolvedTariffs = (region: string | null, province: string | null, city: string | null): Tariff[] => {
    // Order: most specific first
    const candidates: Array<[string | null, string | null, string | null]> = [
      [region, province, city],
      [region, province, null],
      [region, null, null],
      [null, null, null],
    ];
    const out: Partial<Record<Service, Tariff>> = {};
    for (const [r, p, c] of candidates) {
      const list = getTariffs(r, p, c);
      for (const t of list) {
        if (!out[t.service]) out[t.service] = t;
      }
    }
    return Object.values(out).filter((x): x is Tariff => Boolean(x));
  };

  const handleSaveTariffs = async (scope: TariffScope, values: Partial<Record<Service, { pricePerM3Cents: number; maxVolumeM3: number | null }>>) => {
    setSaving(true);
    try {
      for (const s of SERVICES) {
        const v = values[s.value];
        if (v === undefined) continue;
        await fetch("/api/store/shipping/tariffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: "IT",
            regionCode: scope.regionCode,
            provinceCode: scope.provinceCode,
            cityCode: scope.cityCode,
            service: s.value,
            pricePerM3Cents: v.pricePerM3Cents,
            maxVolumeM3: v.maxVolumeM3,
          }),
        });
      }
      await fetchAll();
      showToast("Tariffe salvate", true);
      setEditor(null);
    } catch (e) {
      showToast("Errore salvataggio", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTariffs = async (region: string | null, province: string | null, city: string | null) => {
    if (!confirm("Rimuovere l'override da questo livello? Erediterà dal livello superiore.")) return;
    const ts = getTariffs(region, province, city);
    for (const t of ts) {
      await fetch(`/api/store/shipping/tariffs/${t.id}`, { method: "DELETE" });
    }
    await fetchAll();
    showToast("Override rimosso", true);
  };

  const handleCreateCityTariff = async (province: Province, cityName: string) => {
    setSaving(true);
    try {
      // Crea la città (usando una tariffa bozza)
      await fetch("/api/store/shipping/tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: "IT",
          regionCode: province.regionCode,
          provinceCode: province.code,
          cityName,
          service: "CURBSIDE",
          pricePerM3Cents: 0,
        }),
      });
      await fetchAll();
      setAddCityFor(null);
      showToast(`Città "${cityName}" creata, ora imposta le tariffe`, true);
    } catch {
      showToast("Errore", false);
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

  const countryTariffs = getTariffs(null, null, null);

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900">Spedizioni</h1>
        <p className="text-sm text-warm-500 mt-1">
          Tariffe €/m³ (IVA esclusa) per Italia. Gerarchia <strong>Regione → Provincia → Città</strong>.
          Il livello più specifico ha priorità, se manca si eredita dal livello superiore.
        </p>
      </header>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <strong>Come funziona:</strong> imposta la tariffa al livello più generico possibile (regione).
          Solo dove serve un prezzo diverso, aggiungi un override su provincia o città.
          Il calcolo usa sempre la tariffa più vicina alla destinazione del cliente.
        </div>
      </div>

      {/* Country-level (fallback) */}
      <section className="bg-white rounded-lg border border-warm-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-warm-900">🇮🇹 Italia — fallback paese</div>
            <div className="text-xs text-warm-500 mt-0.5">
              Usata quando né regione, né provincia, né città hanno tariffa definita.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {countryTariffs.length > 0 && (
              <span className="text-sm text-warm-700 font-mono">{tariffLabel(countryTariffs)}</span>
            )}
            <button
              onClick={() => setEditor({
                scope: { level: "country", regionCode: null, provinceCode: null, cityCode: null },
                label: "Italia (fallback paese)",
              })}
              className="px-3 py-1.5 text-sm bg-warm-100 hover:bg-warm-200 rounded-lg inline-flex items-center gap-1"
            >
              <Pencil size={12} /> {countryTariffs.length > 0 ? "Modifica" : "Imposta"}
            </button>
            {countryTariffs.length > 0 && (
              <button
                onClick={() => handleDeleteTariffs(null, null, null)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                title="Rimuovi"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Regioni */}
      <div className="space-y-2">
        {regions.map((r) => {
          const regProvinces = provinces.filter((p) => p.regionCode === r.code);
          const regTariffs = getTariffs(r.code, null, null);
          const isOpen = expanded[`r:${r.code}`];
          const hasOverride = regTariffs.length > 0;
          return (
            <section key={r.code} className="bg-white rounded-lg border border-warm-200 overflow-hidden">
              <div className="flex items-center gap-2 p-3 hover:bg-warm-50">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [`r:${r.code}`]: !isOpen }))}
                  className="text-warm-400 p-1"
                >
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-warm-900">{r.name}</div>
                  <div className="text-xs text-warm-500">
                    {regProvinces.length} province
                    {hasOverride ? (
                      <span className="ml-2 text-warm-700">· tariffa regione: <span className="font-mono">{tariffLabel(regTariffs)}</span></span>
                    ) : (
                      <span className="ml-2 text-warm-400 italic">nessuna tariffa regione</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setEditor({
                      scope: { level: "region", regionCode: r.code, provinceCode: null, cityCode: null },
                      label: `Regione ${r.name}`,
                    })
                  }
                  className="px-3 py-1.5 text-xs bg-warm-100 hover:bg-warm-200 rounded-lg inline-flex items-center gap-1"
                >
                  <Pencil size={12} /> {hasOverride ? "Modifica regione" : "Imposta regione"}
                </button>
                {hasOverride && (
                  <button
                    onClick={() => handleDeleteTariffs(r.code, null, null)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Rimuovi tariffa regione"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-warm-100 bg-warm-50/50 divide-y divide-warm-100">
                  {regProvinces.map((p) => {
                    const provTariffs = getTariffs(r.code, p.code, null);
                    const provHasOverride = provTariffs.length > 0;
                    const provCities = cities.filter((c) => c.provinceCode === p.code);
                    const isProvOpen = expanded[`p:${p.code}`];
                    const effective = resolvedTariffs(r.code, p.code, null);
                    return (
                      <div key={p.code}>
                        <div className="flex items-center gap-2 p-3 pl-10 hover:bg-warm-50">
                          <button
                            onClick={() => setExpanded((e) => ({ ...e, [`p:${p.code}`]: !isProvOpen }))}
                            className={`text-warm-400 p-1 ${provCities.length === 0 && !provHasOverride ? "invisible" : ""}`}
                          >
                            {isProvOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-warm-900">
                              {p.name}
                              <span className="ml-2 text-xs text-warm-400 font-mono">{p.code}</span>
                            </div>
                            <div className="text-xs">
                              {provHasOverride ? (
                                <span className="text-amber-700 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                  <strong>Override provincia</strong>: <span className="font-mono">{tariffLabel(provTariffs)}</span>
                                </span>
                              ) : effective.length > 0 ? (
                                <span className="text-warm-500 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-warm-300 rounded-full" />
                                  eredita: <span className="font-mono">{tariffLabel(effective)}</span>
                                </span>
                              ) : (
                                <span className="text-red-500 inline-flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  nessuna tariffa disponibile
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setEditor({
                                scope: { level: "province", regionCode: r.code, provinceCode: p.code, cityCode: null },
                                label: `Provincia ${p.name}`,
                              })
                            }
                            className="px-2.5 py-1 text-xs bg-white border border-warm-200 hover:bg-warm-100 rounded inline-flex items-center gap-1"
                          >
                            <Pencil size={11} /> {provHasOverride ? "Modifica" : "Override"}
                          </button>
                          {provHasOverride && (
                            <button
                              onClick={() => handleDeleteTariffs(r.code, p.code, null)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Rimuovi override"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => setAddCityFor(p)}
                            className="p-1 text-warm-500 hover:text-warm-900 hover:bg-white rounded"
                            title="Aggiungi città con tariffa custom"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {isProvOpen && provCities.length > 0 && (
                          <div className="bg-white divide-y divide-warm-100">
                            {provCities.map((c) => {
                              const cityTariffs = getTariffs(r.code, p.code, c.code);
                              const cityEff = resolvedTariffs(r.code, p.code, c.code);
                              return (
                                <div key={c.code} className="flex items-center gap-2 p-2 pl-16 hover:bg-warm-50">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-warm-800">{c.name}</div>
                                    <div className="text-xs">
                                      {cityTariffs.length > 0 ? (
                                        <span className="text-amber-700 inline-flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                          <strong>Override città</strong>: <span className="font-mono">{tariffLabel(cityTariffs)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-warm-500 inline-flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 bg-warm-300 rounded-full" />
                                          eredita: <span className="font-mono">{tariffLabel(cityEff)}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setEditor({
                                        scope: { level: "city", regionCode: r.code, provinceCode: p.code, cityCode: c.code },
                                        label: `Città ${c.name}`,
                                      })
                                    }
                                    className="px-2 py-1 text-xs bg-warm-100 hover:bg-warm-200 rounded"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  {cityTariffs.length > 0 && (
                                    <button
                                      onClick={() => handleDeleteTariffs(r.code, p.code, c.code)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      title="Rimuovi override"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editor && (
        <TariffEditor
          label={editor.label}
          scope={editor.scope}
          existing={getTariffs(editor.scope.regionCode, editor.scope.provinceCode, editor.scope.cityCode)}
          effective={resolvedTariffs(editor.scope.regionCode, editor.scope.provinceCode, editor.scope.cityCode)}
          onSave={handleSaveTariffs}
          onCancel={() => setEditor(null)}
          saving={saving}
        />
      )}

      {addCityFor && (
        <AddCityModal
          province={addCityFor}
          onSave={handleCreateCityTariff}
          onCancel={() => setAddCityFor(null)}
          saving={saving}
        />
      )}

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

function TariffEditor({
  label, scope, existing, effective, onSave, onCancel, saving,
}: {
  label: string;
  scope: TariffScope;
  existing: Tariff[];
  effective: Tariff[];
  onSave: (scope: TariffScope, values: Partial<Record<Service, { pricePerM3Cents: number; maxVolumeM3: number | null }>>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const initial: Record<Service, number> = {
    CURBSIDE: (existing.find((t) => t.service === "CURBSIDE")?.pricePerM3Cents
      ?? effective.find((t) => t.service === "CURBSIDE")?.pricePerM3Cents ?? 0) / 100,
    FLOOR_1_3: (existing.find((t) => t.service === "FLOOR_1_3")?.pricePerM3Cents
      ?? effective.find((t) => t.service === "FLOOR_1_3")?.pricePerM3Cents ?? 0) / 100,
    FLOOR_4_10_MAX6: (existing.find((t) => t.service === "FLOOR_4_10_MAX6")?.pricePerM3Cents
      ?? effective.find((t) => t.service === "FLOOR_4_10_MAX6")?.pricePerM3Cents ?? 0) / 100,
  };
  const [vals, setVals] = useState<Record<Service, string>>({
    CURBSIDE: initial.CURBSIDE.toString(),
    FLOOR_1_3: initial.FLOOR_1_3.toString(),
    FLOOR_4_10_MAX6: initial.FLOOR_4_10_MAX6.toString(),
  });

  const update = (s: Service, v: string) => setVals((prev) => ({ ...prev, [s]: v }));

  const save = () => {
    const payload: Partial<Record<Service, { pricePerM3Cents: number; maxVolumeM3: number | null }>> = {};
    for (const s of SERVICES) {
      const cents = Math.round(Number(vals[s.value]) * 100);
      if (Number.isFinite(cents) && cents >= 0) {
        payload[s.value] = {
          pricePerM3Cents: cents,
          maxVolumeM3: s.value === "FLOOR_4_10_MAX6" ? 6 : null,
        };
      }
    }
    onSave(scope, payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-warm-900">Tariffe: {label}</h2>
            <p className="text-xs text-warm-500 mt-0.5">Prezzi €/m³ IVA esclusa</p>
          </div>
          <button onClick={onCancel} className="text-warm-400 hover:text-warm-900">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {SERVICES.map((s) => (
            <div key={s.value} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-warm-900">{s.label}</div>
                {s.value === "FLOOR_4_10_MAX6" && (
                  <div className="text-xs text-warm-500">Limite automatico: volume carrello ≤ 6 m³</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={vals[s.value]}
                  onChange={(e) => update(s.value, e.target.value)}
                  className="w-28 px-3 py-2 border border-warm-200 rounded-lg text-sm text-right"
                />
                <span className="text-sm text-warm-500 w-12">€/m³</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900">Annulla</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Salva tariffe
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCityModal({
  province, onSave, onCancel, saving,
}: {
  province: Province;
  onSave: (province: Province, cityName: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
          <h2 className="font-semibold text-warm-900">Aggiungi città a {province.name}</h2>
          <button onClick={onCancel} className="text-warm-400 hover:text-warm-900"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`es. Fiumicino (provincia di ${province.name})`}
            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
          <p className="text-xs text-warm-500">
            Verrà creata una città con tariffa placeholder. Poi potrai impostare le tariffe specifiche.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900">Annulla</button>
          <button
            onClick={() => name.trim() && onSave(province, name.trim())}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm"
          >
            Crea e imposta tariffe
          </button>
        </div>
      </div>
    </div>
  );
}
