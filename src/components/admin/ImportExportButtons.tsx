"use client";

import { useRef, useState } from "react";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ImportResult {
  imported?: number;
  updated?: number;
  skipped?: number;
  total?: number;
  errors?: string[];
}

interface Props {
  /** URL endpoint export (es. "/api/store/customers?format=csv&q=..." già con i filtri) */
  exportUrl: string;
  exportLabel?: string;
  /** Endpoint POST per l'import. Riceve {rows: [...]} */
  importUrl: string;
  /** Mapping colonne CSV → campo backend. Es. {email: ['email', 'e-mail'], firstName: ['nome', 'firstname']} */
  importColumns: Record<string, string[]>;
  /** Esempio CSV mostrato nel modal import */
  exampleCsv: string;
  /** Filename suggerito per il template CSV vuoto */
  templateFilename?: string;
  /** Callback dopo import completato (per ricaricare la lista) */
  onImported?: () => void;
}

/**
 * Bottoni "Importa" + "Esporta" usati nelle 3 pagine persone (clienti, utenti,
 * professionisti). Stile uniforme — entrambi sono `bg-warm-100 text-warm-700`
 * con border `rounded`.
 *
 * Esporta: download diretto del CSV dall'endpoint.
 * Importa: apre modal con file picker; parsing CSV semplice (header + righe),
 *          mappa le colonne tramite `importColumns`, POST a `importUrl`.
 */
export default function ImportExportButtons({
  exportUrl, exportLabel = "Esporta CSV",
  importUrl, importColumns, exampleCsv,
  templateFilename = "template-import.csv",
  onImported,
}: Props) {
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const exportNow = () => {
    window.open(exportUrl, "_blank");
  };

  const downloadTemplate = () => {
    const blob = new Blob([exampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const text = await file.text();
      // Parser CSV semplice (supporta virgola, doppi apici, escape "")
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setError("Il file deve contenere almeno una riga di header e una di dati");
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      // Costruisci mapping: per ogni campo backend, trova l'indice della colonna nell'header
      const colIdx: Record<string, number> = {};
      for (const [field, aliases] of Object.entries(importColumns)) {
        for (let i = 0; i < header.length; i++) {
          if (aliases.some((a) => a.toLowerCase() === header[i])) {
            colIdx[field] = i;
            break;
          }
        }
      }
      const mapped = rows.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        for (const [field, idx] of Object.entries(colIdx)) {
          obj[field] = (row[idx] || "").trim();
        }
        return obj;
      }).filter((r) => Object.values(r).some((v) => v.length > 0));
      if (mapped.length === 0) {
        setError("Nessuna riga valida trovata. Controlla che il CSV abbia almeno la colonna 'email'.");
        return;
      }

      const res = await fetch(importUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mapped }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        onImported?.();
      } else {
        setError(data.error || "Errore");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore lettura file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setShowImport(true); setResult(null); setError(""); }}
        className="inline-flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded text-sm font-medium hover:bg-warm-200 transition-colors"
      >
        <Upload size={14} /> Importa
      </button>
      <button
        type="button"
        onClick={exportNow}
        className="inline-flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded text-sm font-medium hover:bg-warm-200 transition-colors"
        title={exportLabel}
      >
        <Download size={14} /> Esporta
      </button>

      {/* Modal Import */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !importing && setShowImport(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-warm-900">
                <Upload size={16} />
                <h2 className="font-semibold">Importa CSV</h2>
              </div>
              <button onClick={() => !importing && setShowImport(false)} className="text-warm-400 hover:text-warm-900"><X size={18} /></button>
            </div>

            <div className="p-5 flex-1 overflow-auto">
              {result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 text-emerald-800">
                    <CheckCircle2 size={20} />
                    <div className="text-sm">
                      <div className="font-medium">Import completato</div>
                      <div>
                        <strong>{result.imported || 0}</strong> nuovi · <strong>{result.updated || 0}</strong> aggiornati · <strong>{result.skipped || 0}</strong> saltati · {result.total || 0} totali
                      </div>
                    </div>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 max-h-40 overflow-y-auto">
                      <div className="font-medium mb-1">Errori sulle prime righe:</div>
                      {result.errors.map((e, i) => <div key={i} className="font-mono text-[11px]">{e}</div>)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-600 mb-3">
                    Carica un file CSV. Le colonne accettate sono:
                  </p>
                  <ul className="text-xs text-warm-700 space-y-0.5 mb-3 ml-4 list-disc">
                    {Object.entries(importColumns).map(([field, aliases]) => (
                      <li key={field}>
                        <strong>{field}</strong>: {aliases.join(", ")}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="text-xs text-warm-700 hover:text-warm-900 underline"
                  >
                    Scarica template CSV
                  </button>

                  <div className="mt-4 border-2 border-dashed border-warm-300 rounded p-4 text-center">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                      className="block w-full text-sm text-warm-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-warm-200 file:text-warm-800 file:cursor-pointer hover:file:bg-warm-300 disabled:opacity-50"
                      disabled={importing}
                    />
                    {importing && (
                      <div className="text-xs text-warm-500 mt-3 inline-flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Import in corso…
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-warm-200 flex justify-end bg-warm-50/50">
              <button onClick={() => setShowImport(false)} disabled={importing} className="px-4 py-2 text-sm bg-warm-900 text-white rounded hover:bg-warm-800 disabled:opacity-50">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Parser CSV minimale: supporta virgolette per stringhe con virgole/newline. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalizza BOM
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && t[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}
