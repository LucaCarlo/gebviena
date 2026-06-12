"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, ExternalLink, AlertTriangle } from "lucide-react";
import { useProSettings, Toast } from "../useProSettings";

const DEFAULT_TITLE = "Area in manutenzione";
const DEFAULT_MESSAGE = "Stiamo aggiornando l’area riservata ai professionisti. Torna a trovarci tra poco — grazie per la pazienza.";

export default function MaintenanceTab() {
  const { values, loading, saving, toast, save } = useProSettings();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTitle(values["professionals.maintenance.title"] || DEFAULT_TITLE);
    setMessage(values["professionals.maintenance.message"] || DEFAULT_MESSAGE);
  }, [values]);

  const onSave = () => {
    save({
      "professionals.maintenance.title": title.trim() || DEFAULT_TITLE,
      "professionals.maintenance.message": message.trim() || DEFAULT_MESSAGE,
    });
  };

  return (
    <div>
      <div className="border-l-2 border-amber-400 bg-amber-50 text-amber-900 text-xs px-3 py-2 mb-5 rounded-r flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Questi sono il titolo e il messaggio della pagina di manutenzione che i professionisti vedono se l’area è disattivata.
          <strong className="font-medium"> L’attivazione/disattivazione vera dell’area si fa nel tab “Impostazioni area riservata”.</strong>
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-20 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Titolo della pagina di manutenzione
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_TITLE}
              className="w-full px-3 py-2 border border-warm-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Messaggio
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={DEFAULT_MESSAGE}
              className="w-full px-3 py-2 border border-warm-300 rounded text-sm resize-none"
            />
            <p className="text-[11px] text-warm-500 mt-1">Testo principale mostrato sotto al titolo. Resta semplice: niente HTML.</p>
          </div>

          {/* Anteprima */}
          <div className="border border-warm-300 rounded-lg overflow-hidden">
            <div className="bg-warm-100 text-[10px] uppercase tracking-wider text-warm-600 px-3 py-1.5">
              Anteprima
            </div>
            <div className="bg-warm-50 px-6 py-10 text-center">
              <AlertTriangle size={28} className="mx-auto text-warm-500 mb-3" />
              <h3 className="text-2xl md:text-3xl font-serif text-warm-900 mb-3">{title || DEFAULT_TITLE}</h3>
              <p className="text-sm text-warm-700 max-w-xl mx-auto whitespace-pre-line">{message || DEFAULT_MESSAGE}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-warm-100">
            <a
              href="/area-professionisti/manutenzione"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-warm-700 hover:text-warm-900"
            >
              Apri pagina manutenzione live <ExternalLink size={12} />
            </a>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-warm-900 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salva testi
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
