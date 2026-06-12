"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { useProSettings, Toast } from "../useProSettings";

interface PconProduct { id: string; name: string; slug: string }

export default function PconConfigTab() {
  const { values, loading, saving, toast, save } = useProSettings();
  const [enabled, setEnabled] = useState(true);
  const [productSlug, setProductSlug] = useState("");
  const [products, setProducts] = useState<PconProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    setEnabled(values["professionals.pcon.enabled"] !== "false");
    setProductSlug(values["professionals.pcon.product_slug"] || "");
  }, [values]);

  // Carica la lista dei prodotti che hanno una config pCon valida
  useEffect(() => {
    setLoadingProducts(true);
    fetch("/api/admin/products/pcon-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProducts(j.data || []); })
      .finally(() => setLoadingProducts(false));
  }, []);

  const onSave = () => {
    save({
      "professionals.pcon.enabled": enabled ? "true" : "false",
      "professionals.pcon.product_slug": productSlug.trim(),
    });
  };

  return (
    <div>
      <div className="border-l-2 border-amber-400 bg-amber-50 text-amber-900 text-xs px-3 py-2 mb-5 rounded-r">
        Configurazione avanzata del configuratore pCon nell’area professionisti.
        Cambia subito visibilità o prodotto di apertura iniziale.
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-16 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Enabled */}
          <div className="border border-warm-200 rounded-lg p-4 bg-warm-50/30">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 accent-warm-800"
              />
              <div>
                <div className="text-sm font-medium text-warm-800">Mostra pCon configuratore nell’area professionisti</div>
                <div className="text-[11px] text-warm-500 mt-0.5">
                  Disattivando, la sezione pCon non comparirà nelle dashboard dei ruoli che la avevano (ARCHITECT, RESELLER, AGENT).
                  Equivale a nascondere temporaneamente il configuratore senza perdere le impostazioni.
                </div>
              </div>
            </label>
          </div>

          {/* Prodotto di default — dropdown dei prodotti con pCon */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Prodotto di apertura (opzionale)
            </label>
            {loadingProducts ? (
              <div className="h-10 w-full md:w-96 bg-warm-100 rounded animate-pulse" />
            ) : (
              <select
                value={productSlug}
                onChange={(e) => setProductSlug(e.target.value)}
                disabled={!enabled}
                className="w-full md:w-96 px-3 py-2 border border-warm-300 rounded text-sm bg-white disabled:opacity-50"
              >
                <option value="">— Home del catalogo pCon —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-warm-500 mt-1">
              Solo i prodotti del catalogo con una configurazione pCon (codice <code>ban</code>) compaiono qui.
              {" "}{products.length === 0 && !loadingProducts && (
                <span className="text-amber-700">Nessun prodotto ha ancora una config pCon: configurala dal singolo prodotto in <em>Admin → Prodotti</em>.</span>
              )}
              {" "}Quando un prodotto è scelto, pCon apre la sua configurazione (ban/sid/ovc) al posto della home.
            </p>
          </div>

          {/* Anteprima link */}
          <div className="border border-warm-200 rounded-lg p-4 bg-warm-50/30">
            <div className="text-[11px] text-warm-500 uppercase tracking-wider font-medium mb-2">Verifica veloce</div>
            <a
              href="/area-professionisti/pcon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-warm-800 hover:underline"
            >
              Apri pagina pCon nell’area professionisti <ExternalLink size={12} />
            </a>
            <p className="text-[11px] text-warm-500 mt-2">
              Nota: la barra in alto del configuratore include nativamente il pulsante <strong>“Torna al catalogo”</strong> di pCon (parametro <code>sh=true</code> già impostato). Funziona da dentro qualsiasi prodotto.
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
