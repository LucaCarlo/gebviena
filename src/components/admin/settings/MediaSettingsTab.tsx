"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";

type OutputFormat = "webp" | "jpeg" | "preserve";
type PresetKey = "cover" | "hero" | "side" | "gallery" | "thumbnail" | "general" | "news" | "variant" | "dimensions";

interface PresetConfig { maxWidth: number; maxHeight: number; quality: number }
interface MediaSettings {
  presets: Record<PresetKey, PresetConfig>;
  format: OutputFormat;
  keepOriginal: boolean;
  generateVariants: boolean;
  mediumMaxWidth: number;
  mediumQuality: number;
  thumbnailMaxWidth: number;
  thumbnailQuality: number;
}

// Etichette umane per ciascun preset. Ordinato per priorita' visiva.
const PRESET_META: Array<{ key: PresetKey; label: string; usedFor: string }> = [
  { key: "hero",       label: "Hero / Slideshow homepage", usedFor: "Slide grandi in homepage e header prodotto" },
  { key: "cover",      label: "Cover prodotto",             usedFor: "Immagine principale nelle liste prodotto" },
  { key: "gallery",    label: "Galleria prodotto",          usedFor: "Foto dettaglio nelle gallerie prodotto" },
  { key: "side",       label: "Foto laterali",              usedFor: "Immagini secondarie in schede prodotto" },
  { key: "news",       label: "News / Blog",                usedFor: "Copertine articoli e blocchi news" },
  { key: "general",    label: "Generico",                   usedFor: "Fallback per upload senza preset esplicito" },
  { key: "variant",    label: "Varianti prodotto",          usedFor: "Miniature di varianti (colori/finiture)" },
  { key: "thumbnail",  label: "Miniature",                  usedFor: "Anteprime, breadcrumb, riepiloghi" },
  { key: "dimensions", label: "Disegni tecnici / quotature", usedFor: "Immagini con misure e dettagli tecnici" },
];

export default function MediaSettingsTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [settings, setSettings] = useState<MediaSettings | null>(null);
  const [defaults, setDefaults] = useState<MediaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/media-settings");
      const j = await r.json();
      if (j.success) {
        setSettings(j.data);
        setDefaults(j.defaults);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/media-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = await r.json();
      if (j.success) {
        setSettings(j.data);
        showToast("Impostazioni Media salvate", "success");
      } else {
        showToast(j.error || "Errore salvataggio", "error");
      }
    } catch {
      showToast("Errore di rete", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!defaults) return;
    if (!confirm("Ripristinare i valori di default? Le modifiche non salvate andranno perse.")) return;
    setSettings(defaults);
  };

  const updatePreset = (key: PresetKey, patch: Partial<PresetConfig>) => {
    if (!settings) return;
    setSettings({ ...settings, presets: { ...settings.presets, [key]: { ...settings.presets[key], ...patch } } });
  };

  if (loading || !settings) {
    return <div className="flex items-center gap-2 text-warm-500"><Loader2 size={16} className="animate-spin" /> Caricamento…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Media / Immagini</h2>
        <p className="text-sm text-warm-500 mt-1">
          Configura come vengono processate le immagini caricate sul sito. Le modifiche valgono per i nuovi upload —
          le immagini gia caricate rimangono come sono.
        </p>
      </div>

      {/* Formato output + toggle globali */}
      <div className="bg-white border border-warm-200 rounded-lg p-5 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-700">Formato e opzioni globali</h3>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Formato di output</label>
            <select
              value={settings.format}
              onChange={(e) => setSettings({ ...settings, format: e.target.value as OutputFormat })}
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
            >
              <option value="webp">WebP (consigliato — leggero e nitido)</option>
              <option value="jpeg">JPEG (compatibilita massima, file piu grande)</option>
              <option value="preserve">Preserva originale (JPG/PNG/WebP come caricato)</option>
            </select>
            <p className="text-[11px] text-warm-500 mt-1">
              WebP e supportato da tutti i browser moderni e da Bunny CDN. JPEG solo se hai casi che devono rimanere JPG.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.keepOriginal}
                onChange={(e) => setSettings({ ...settings, keepOriginal: e.target.checked })}
                className="w-4 h-4 accent-warm-800"
              />
              <span className="text-sm text-warm-800">
                Conserva anche il file <strong>originale</strong> accanto alla versione compressa
                <span className="block text-[11px] text-warm-500">Utile per rielaborare in futuro. Occupa piu spazio. Default: NO.</span>
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.generateVariants}
                onChange={(e) => setSettings({ ...settings, generateVariants: e.target.checked })}
                className="w-4 h-4 accent-warm-800"
              />
              <span className="text-sm text-warm-800">
                Genera automaticamente <strong>medium (800px)</strong> e <strong>thumbnail (400px)</strong>
                <span className="block text-[11px] text-warm-500">Servono per anteprime e liste. Consigliato ON.</span>
              </span>
            </label>
          </div>
        </div>

        {settings.generateVariants && (
          <div className="border-t border-warm-100 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-warm-600 uppercase mb-1">Medium — larghezza (px)</label>
              <input type="number" min={200} max={4000} value={settings.mediumMaxWidth}
                onChange={(e) => setSettings({ ...settings, mediumMaxWidth: Number(e.target.value) || 800 })}
                className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-warm-600 uppercase mb-1">Medium — qualita</label>
              <input type="number" min={30} max={100} value={settings.mediumQuality}
                onChange={(e) => setSettings({ ...settings, mediumQuality: Number(e.target.value) || 88 })}
                className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-warm-600 uppercase mb-1">Thumbnail — larghezza (px)</label>
              <input type="number" min={100} max={800} value={settings.thumbnailMaxWidth}
                onChange={(e) => setSettings({ ...settings, thumbnailMaxWidth: Number(e.target.value) || 400 })}
                className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-warm-600 uppercase mb-1">Thumbnail — qualita</label>
              <input type="number" min={30} max={100} value={settings.thumbnailQuality}
                onChange={(e) => setSettings({ ...settings, thumbnailQuality: Number(e.target.value) || 82 })}
                className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Tabella preset per purpose */}
      <div className="bg-white border border-warm-200 rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-700">Preset per tipologia di immagine</h3>
            <p className="text-xs text-warm-500 mt-1">
              Ogni tipologia usa il proprio preset. Alzare la larghezza aumenta la nitidezza su schermi retina/4K e il peso del file.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-warm-600 border-b border-warm-200">
                <th className="text-left py-2 pr-4">Tipologia</th>
                <th className="text-left py-2 px-3">Larghezza max (px)</th>
                <th className="text-left py-2 px-3">Altezza max (px)</th>
                <th className="text-left py-2 px-3">Qualita (30-100)</th>
              </tr>
            </thead>
            <tbody>
              {PRESET_META.map(({ key, label, usedFor }) => {
                const p = settings.presets[key];
                return (
                  <tr key={key} className="border-b border-warm-100 last:border-none">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-warm-800">{label}</div>
                      <div className="text-[11px] text-warm-500">{usedFor}</div>
                    </td>
                    <td className="py-3 px-3 w-32">
                      <input type="number" min={100} max={6000} value={p.maxWidth}
                        onChange={(e) => updatePreset(key, { maxWidth: Number(e.target.value) || 0 })}
                        className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
                    </td>
                    <td className="py-3 px-3 w-32">
                      <input type="number" min={100} max={6000} value={p.maxHeight}
                        onChange={(e) => updatePreset(key, { maxHeight: Number(e.target.value) || 0 })}
                        className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
                    </td>
                    <td className="py-3 px-3 w-32">
                      <input type="number" min={30} max={100} value={p.quality}
                        onChange={(e) => updatePreset(key, { quality: Number(e.target.value) || 0 })}
                        className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={resetToDefaults}
          className="inline-flex items-center gap-2 text-sm text-warm-700 hover:text-warm-900"
        >
          <RotateCcw size={14} /> Ripristina valori consigliati
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-warm-800 text-white text-sm px-5 py-2.5 rounded hover:bg-warm-900 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Salva impostazioni Media
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <strong>Nota:</strong> le modifiche valgono per gli upload <em>nuovi</em>. Le foto gia caricate rimangono come sono.
        Per rigenerare in alta risoluzione una foto esistente occorre ricaricare il file originale dall&apos;admin.
      </div>
    </div>
  );
}
