"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, AlertTriangle, Shield } from "lucide-react";
import { useProSettings, Toast } from "../useProSettings";

const ROLES = [
  { code: "ARCHITECT_DESIGNER", label: "Architetti / Designer" },
  { code: "PRESS",              label: "Stampa" },
  { code: "RESELLER",           label: "Rivenditori" },
  { code: "AGENT",              label: "Agenti" },
] as const;

const SECTIONS = [
  { slug: "informazioni-tecniche", label: "Informazioni tecniche", defaultFor: ["ARCHITECT_DESIGNER", "RESELLER", "AGENT"] },
  { slug: "digital-media",         label: "Digital & Media",       defaultFor: ["ARCHITECT_DESIGNER", "PRESS", "RESELLER", "AGENT"] },
  { slug: "cataloghi",             label: "Cataloghi, poster e journal", defaultFor: ["ARCHITECT_DESIGNER", "RESELLER", "AGENT"] },
  { slug: "pcon",                  label: "pCon configuratore",    defaultFor: ["ARCHITECT_DESIGNER", "RESELLER", "AGENT"] },
  { slug: "press-kit",             label: "Press kit",             defaultFor: ["PRESS"] },
  { slug: "listino-prezzi",        label: "Listino prezzi",        defaultFor: ["RESELLER", "AGENT"] },
  { slug: "materiale-aziendale",   label: "Materiale aziendale",   defaultFor: ["RESELLER", "AGENT"] },
] as const;

function isVisible(values: Record<string, string>, role: string, slug: string): boolean {
  const key = `professionals.section.${role}.${slug}`;
  if (key in values) return values[key] === "true";
  // default da configurazione iniziale (compatibile con SECTIONS_BY_ROLE)
  const def = SECTIONS.find((s) => s.slug === slug);
  return !!def && (def.defaultFor as readonly string[]).includes(role);
}

export default function AreaSettingsTab() {
  const { values, loading, saving, toast, save } = useProSettings();
  const [areaDisabled, setAreaDisabled] = useState(false);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  // matrix[role][section] = boolean

  useEffect(() => {
    setAreaDisabled(values["professionals.area.disabled"] === "true");
    const next: Record<string, Record<string, boolean>> = {};
    for (const r of ROLES) {
      next[r.code] = {};
      for (const s of SECTIONS) next[r.code][s.slug] = isVisible(values, r.code, s.slug);
    }
    setMatrix(next);
  }, [values]);

  const toggle = (role: string, slug: string) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [slug]: !prev[role][slug] },
    }));
  };

  const onSave = () => {
    const patch: Record<string, string> = {
      "professionals.area.disabled": areaDisabled ? "true" : "false",
    };
    for (const r of ROLES) {
      for (const s of SECTIONS) {
        patch[`professionals.section.${r.code}.${s.slug}`] = matrix[r.code]?.[s.slug] ? "true" : "false";
      }
    }
    save(patch);
  };

  return (
    <div>
      <div className="border-l-2 border-amber-400 bg-amber-50 text-amber-900 text-xs px-3 py-2 mb-5 rounded-r flex items-start gap-2">
        <Shield size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Controlla la visibilità complessiva dell’area riservata e, ruolo per ruolo, quali sezioni mostrare.
          La matrice serve sia in fase di transizione (es. nuova sezione visibile solo agli agenti) sia per disattivare temporaneamente
          una sezione (es. listino vecchio mentre carichi il nuovo).
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Toggle area disattivata */}
          <div className={`border rounded-lg p-4 ${areaDisabled ? "bg-red-50 border-red-200" : "bg-warm-50/30 border-warm-200"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={areaDisabled}
                onChange={(e) => setAreaDisabled(e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-700"
              />
              <div>
                <div className={`text-sm font-medium ${areaDisabled ? "text-red-800" : "text-warm-800"} flex items-center gap-2`}>
                  {areaDisabled && <AlertTriangle size={14} className="text-red-700" />}
                  Disattiva l’area professionisti (mostra pagina manutenzione)
                </div>
                <div className="text-[11px] text-warm-500 mt-0.5">
                  Quando attivo, tutti i professionisti che entrano in <code>/area-professionisti/*</code> vengono rediretti alla pagina di manutenzione (testi configurabili nella tab “Pagina manutenzione”).
                  L’accesso e il login restano attivi (così l’admin può continuare a lavorarci).
                </div>
              </div>
            </label>
          </div>

          {/* Matrice ruolo × sezione */}
          <div>
            <h3 className="text-sm font-semibold text-warm-800 mb-3">Visibilità sezioni per ruolo</h3>
            <div className="overflow-x-auto bg-white border border-warm-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Sezione</th>
                    {ROLES.map((r) => (
                      <th key={r.code} className="text-center px-4 py-3">{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {SECTIONS.map((s) => (
                    <tr key={s.slug} className={`hover:bg-warm-50/50 ${areaDisabled ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2.5 font-medium text-warm-800">
                        {s.label}
                        <div className="text-[10px] text-warm-400 font-normal font-mono">/{s.slug}</div>
                      </td>
                      {ROLES.map((r) => (
                        <td key={r.code} className="text-center px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={!!matrix[r.code]?.[s.slug]}
                            onChange={() => toggle(r.code, s.slug)}
                            disabled={areaDisabled}
                            className="w-4 h-4 accent-warm-800 cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-warm-500 mt-2">
              Una sezione spuntata = visibile nella dashboard di quel ruolo. Non spuntata = nascosta (e l’accesso diretto via URL viene redirect a dashboard).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-100">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-warm-900 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salva impostazioni
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
