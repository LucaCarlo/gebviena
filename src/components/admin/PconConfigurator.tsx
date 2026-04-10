"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Download, Trash2, Check } from "lucide-react";
import {
  buildPconUrl,
  buildPconAdminUrl,
  parsePconUrl,
  summarizePconOvc,
  PCON_DEFAULT_MOC,
  type PconConfig,
} from "@/lib/pcon";

interface Props {
  value: PconConfig;
  onChange: (next: PconConfig) => void;
}

interface PendingCapture {
  moc?: string;
  ban?: string;
  sid?: string;
  ovc?: string;
}

export default function PconConfigurator({ value, onChange }: Props) {
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [importedFlash, setImportedFlash] = useState(false);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isConfigured = Boolean(value.ban && value.ban.trim());

  const iframeSrc = useMemo(() => {
    return isConfigured ? buildPconUrl(value) : buildPconUrl({});
  }, [value, isConfigured]);

  const previewUrl = useMemo(() => (isConfigured ? buildPconUrl(value) : ""), [value, isConfigured]);
  const adminPanelUrl = useMemo(() => buildPconAdminUrl(value), [value]);

  // Progressive enhancement: if pcon ever sends propertyChanged postMessages
  // (requires user-tracking enabled on the GatekeeperID server-side), capture
  // them automatically. Otherwise this listener is just idle.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      try {
        if (typeof ev.origin === "string" && !ev.origin.includes("pcon-solutions.com")) return;
        const data = ev.data;
        if (!data || typeof data !== "object") return;
        const action = (data as { action?: string }).action;
        const payload = (data as { data?: Record<string, unknown> }).data;
        if (action !== "message" || !payload) return;
        const type = payload.type;
        if (type !== "propertyChanged") return;
        const next: PendingCapture = {
          moc: typeof payload.manufacturerId === "string" ? (payload.manufacturerId as string) : undefined,
          sid: typeof payload.seriesId === "string" ? (payload.seriesId as string) : undefined,
          ban: typeof payload.baseArticleNumber === "string" ? (payload.baseArticleNumber as string) : undefined,
          ovc:
            typeof payload.ofmlVariantCode === "string"
              ? (payload.ofmlVariantCode as string)
              : typeof payload.variantCode === "string"
                ? (payload.variantCode as string)
                : undefined,
        };
        if (next.ban) setPending(next);
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function handleImport() {
    setPasteError("");
    const parsed = parsePconUrl(pasteUrl);
    if (!parsed.ban) {
      setPasteError("URL non valido: manca il parametro 'ban' (codice articolo).");
      return;
    }
    onChange({
      moc: parsed.moc || PCON_DEFAULT_MOC,
      ban: parsed.ban,
      sid: parsed.sid || null,
      ovc: parsed.ovc || null,
    });
    setPasteUrl("");
    setImportedFlash(true);
    setTimeout(() => setImportedFlash(false), 2000);
  }

  function handleApplyPending() {
    if (!pending?.ban) return;
    onChange({
      moc: pending.moc || PCON_DEFAULT_MOC,
      ban: pending.ban,
      sid: pending.sid || null,
      ovc: pending.ovc || null,
    });
    setPending(null);
    setImportedFlash(true);
    setTimeout(() => setImportedFlash(false), 2000);
  }

  function handleClear() {
    onChange({ moc: null, ban: null, sid: null, ovc: null });
  }

  const ovcLines = summarizePconOvc(value.ovc);

  return (
    <div className="space-y-5">
      {/* Stato corrente */}
      {isConfigured ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Configurazione attiva</div>
              <div className="mt-1 text-sm text-warm-800">
                <span className="font-mono">{value.moc || PCON_DEFAULT_MOC}</span>
                {" / "}
                <span className="font-mono">{value.sid || "—"}</span>
                {" / "}
                <span className="font-mono font-semibold">{value.ban}</span>
              </div>
              {ovcLines.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {ovcLines.map((line, i) => (
                    <li key={i} className="rounded bg-white px-2 py-0.5 text-[11px] font-mono text-warm-700 border border-warm-200">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded border border-warm-300 bg-white px-3 py-1.5 text-xs text-warm-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
              title="Rimuovi configurazione pCon"
            >
              <Trash2 size={14} />
              Rimuovi
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50 p-4 text-sm text-warm-600">
          Nessuna configurazione pCon. Il visualizzatore 3D non verrà mostrato sulla pagina prodotto finché non ne imposti una.
        </div>
      )}

      {/* Iframe */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wider">
            {isConfigured ? "Anteprima configurazione" : "Catalogo pCon"}
          </label>
          <a
            href={adminPanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-warm-700 hover:text-warm-900 underline-offset-2 hover:underline"
          >
            <ExternalLink size={13} />
            Apri pCon in nuova scheda per configurare
          </a>
        </div>
        <div className="rounded-lg overflow-hidden border border-warm-300 bg-white">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full border-0 block"
            style={{ height: 560 }}
            allowFullScreen
            allow="xr-spatial-tracking"
            title="pCon configurator"
          />
        </div>
      </div>

      {/* Cattura automatica (solo se user-tracking attivo su pcon) */}
      {pending?.ban && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Configurazione rilevata dall&apos;iframe</div>
          <div className="text-sm text-warm-800">
            <span className="font-mono">{pending.moc || PCON_DEFAULT_MOC}</span>
            {" / "}
            <span className="font-mono">{pending.sid || "—"}</span>
            {" / "}
            <span className="font-mono font-semibold">{pending.ban}</span>
          </div>
          <button
            type="button"
            onClick={handleApplyPending}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700"
          >
            <Check size={14} />
            Usa questa configurazione
          </button>
        </div>
      )}

      {/* Import via paste */}
      <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-4 space-y-3">
        <div>
          <div className="text-xs font-semibold text-warm-800 uppercase tracking-wider">Importa da URL pCon</div>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Configura il prodotto su pCon (usa il bottone sopra), poi copia l&apos;URL della barra del browser e incollalo qui.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => {
              setPasteUrl(e.target.value);
              setPasteError("");
            }}
            placeholder="https://ui.pcon-solutions.com/#...&moc=GTV&ban=...&sid=...&ovc=..."
            className="flex-1 min-w-0 border border-warm-300 rounded px-3 py-2 text-xs font-mono focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 bg-white"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={!pasteUrl.trim()}
            className="inline-flex items-center gap-1.5 rounded bg-warm-800 text-white px-4 py-2 text-xs font-medium hover:bg-warm-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Importa
          </button>
        </div>
        {pasteError && (
          <div className="text-xs text-red-600">{pasteError}</div>
        )}
        {importedFlash && (
          <div className="text-xs text-emerald-700 flex items-center gap-1">
            <Check size={13} /> Configurazione importata.
          </div>
        )}
      </div>

      {/* Debug URL anteprima (solo se configurato) */}
      {isConfigured && previewUrl && (
        <details className="text-[11px] text-warm-500">
          <summary className="cursor-pointer hover:text-warm-700">Mostra URL generato</summary>
          <div className="mt-2 break-all font-mono bg-warm-50 border border-warm-200 rounded p-2">{previewUrl}</div>
        </details>
      )}
    </div>
  );
}
