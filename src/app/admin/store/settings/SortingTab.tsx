"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2, Loader2 } from "lucide-react";

type Strategy =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "manual"
  | "random";

type RandomMode = "per-request" | "per-session";

interface StoreProductLite {
  id: string;
  name: string;
  slug: string;
  thumb: string | null;
}

interface SortingValues {
  strategy: Strategy;
  randomMode: RandomMode;
  pinnedIds: string[];
  allowUserOverride: boolean;
}

const STRATEGY_LABELS: Array<{ value: Strategy; label: string; hint: string }> = [
  { value: "newest", label: "Più recenti prima", hint: "Per data di pubblicazione decrescente. È la scelta più comune per uno shop." },
  { value: "oldest", label: "Più vecchi prima", hint: "Per data di pubblicazione crescente." },
  { value: "name-asc", label: "Alfabetico A → Z", hint: "Per nome prodotto crescente." },
  { value: "name-desc", label: "Alfabetico Z → A", hint: "Per nome prodotto decrescente." },
  { value: "price-asc", label: "Prezzo crescente", hint: "Dal meno caro al più caro (prezzo effettivo nel mercato del cliente)." },
  { value: "price-desc", label: "Prezzo decrescente", hint: "Dal più caro al meno caro." },
  { value: "manual", label: "Ordine manuale (admin)", hint: "Usa il campo sortOrder che imposti per ciascun prodotto dalla pagina Prodotti." },
  { value: "random", label: "Casuale", hint: "Mescola la lista. Utile per non favorire sempre gli stessi prodotti — ottimo per vetrine 'curated'." },
];

interface Props {
  values: SortingValues;
  onChange: (next: SortingValues) => void;
}

export default function SortingTab({ values, onChange }: Props) {
  const [allProducts, setAllProducts] = useState<StoreProductLite[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  // Carico lista StoreProduct (per il picker e per risolvere il nome dei pinned attuali).
  useEffect(() => {
    setLoadingProducts(true);
    fetch("/api/store/products?published=true")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          // Reduzione a {id, name, slug, thumb}
          interface ApiItem {
            id: string;
            coverImage: string | null;
            product?: { name?: string; slug?: string; imageUrl?: string | null; coverImage?: string | null };
            translations?: Array<{ languageCode: string; name?: string }>;
          }
          const list = (d.data as ApiItem[]).map((sp) => {
            const it = sp.translations?.find((t) => t.languageCode === "it");
            return {
              id: sp.id,
              name: it?.name || sp.product?.name || sp.id,
              slug: sp.product?.slug || "",
              thumb: sp.coverImage || sp.product?.coverImage || sp.product?.imageUrl || null,
            } as StoreProductLite;
          });
          setAllProducts(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const pinnedProducts = values.pinnedIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((x): x is StoreProductLite => !!x);

  const movePinned = useCallback((idx: number, dir: -1 | 1) => {
    const next = [...values.pinnedIds];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onChange({ ...values, pinnedIds: next });
  }, [values, onChange]);

  const removePinned = useCallback((id: string) => {
    onChange({ ...values, pinnedIds: values.pinnedIds.filter((x) => x !== id) });
  }, [values, onChange]);

  const addPinned = useCallback((id: string) => {
    if (values.pinnedIds.includes(id)) return;
    onChange({ ...values, pinnedIds: [...values.pinnedIds, id] });
  }, [values, onChange]);

  const availableForPicker = allProducts.filter((p) => !values.pinnedIds.includes(p.id));
  const filtered = pickerQ.trim()
    ? availableForPicker.filter((p) => p.name.toLowerCase().includes(pickerQ.toLowerCase()))
    : availableForPicker;

  return (
    <div className="space-y-6">
      {/* Strategia */}
      <div>
        <div className="text-sm font-medium text-warm-800 mb-1">Criterio di ordinamento</div>
        <div className="text-xs text-warm-500 mb-3">
          Definisce l&apos;ordine con cui i prodotti compaiono in lista nella vetrina e nelle pagine categoria.
          I prodotti in evidenza (sotto) hanno sempre la precedenza.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STRATEGY_LABELS.map((opt) => {
            const active = values.strategy === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  active ? "border-warm-800 bg-warm-50" : "border-warm-200 hover:bg-warm-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="sort-strategy"
                  value={opt.value}
                  checked={active}
                  onChange={() => onChange({ ...values, strategy: opt.value })}
                  className="mt-0.5 accent-warm-800"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-warm-800">{opt.label}</span>
                  <span className="text-[11px] text-warm-500 mt-0.5">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sotto-opzione Random */}
      {values.strategy === "random" && (
        <div className="border-l-2 border-warm-300 pl-4 ml-1">
          <div className="text-sm font-medium text-warm-800 mb-2">Comportamento del casuale</div>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="random-mode"
                checked={values.randomMode === "per-request"}
                onChange={() => onChange({ ...values, randomMode: "per-request" })}
                className="mt-0.5 accent-warm-800"
              />
              <span>
                <span className="block text-sm text-warm-800">Cambia a ogni visita / pagina caricata</span>
                <span className="block text-[11px] text-warm-500 mt-0.5">
                  L&apos;ordine si rimescola a ogni request. Cliccando su un prodotto e tornando indietro l&apos;ordine sarà diverso.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="random-mode"
                checked={values.randomMode === "per-session"}
                onChange={() => onChange({ ...values, randomMode: "per-session" })}
                className="mt-0.5 accent-warm-800"
              />
              <span>
                <span className="block text-sm text-warm-800">Stabile per sessione (24h)</span>
                <span className="block text-[11px] text-warm-500 mt-0.5">
                  Ogni cliente vede sempre lo stesso ordine durante la sessione (cookie da 24h), ma utenti diversi vedono ordini diversi. Più gentile per la UX.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Permetti override utente */}
      <div className="border-t border-warm-200 pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => onChange({ ...values, allowUserOverride: !values.allowUserOverride })}
            className={`relative w-10 h-6 rounded-full transition-colors mt-0.5 shrink-0 ${
              values.allowUserOverride ? "bg-warm-900" : "bg-warm-300"
            }`}
            aria-pressed={values.allowUserOverride}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              values.allowUserOverride ? "left-[18px]" : "left-0.5"
            }`} />
          </button>
          <span>
            <span className="block text-sm font-medium text-warm-800">Permetti al cliente di cambiare ordinamento dalla vetrina</span>
            <span className="block text-[11px] text-warm-500 mt-0.5">
              Se attivo, il cliente vede un dropdown &quot;Ordina per&quot; e può sovrascrivere la tua scelta. Se disattivato, vale sempre il criterio sopra.
            </span>
          </span>
        </label>
      </div>

      {/* Pinned products */}
      <div className="border-t border-warm-200 pt-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="text-sm font-medium text-warm-800">Prodotti in evidenza (in cima alla lista)</div>
            <div className="text-xs text-warm-500 mt-0.5">
              Massimo libero: i prodotti qui appaiono sempre prima degli altri, nell&apos;ordine indicato.
              Usa le frecce per riordinare.
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowPicker(true); setPickerQ(""); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-warm-300 text-warm-800 hover:bg-warm-50 shrink-0"
          >
            <Plus size={12} /> Aggiungi
          </button>
        </div>

        {loadingProducts ? (
          <div className="py-6 flex justify-center text-warm-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : pinnedProducts.length === 0 ? (
          <div className="border border-dashed border-warm-200 rounded-lg p-6 text-center text-xs text-warm-500">
            Nessun prodotto in evidenza. Clicca su &quot;Aggiungi&quot; per fissare i primi prodotti che vuoi mostrare in cima.
          </div>
        ) : (
          <ul className="border border-warm-200 rounded-lg divide-y divide-warm-100">
            {pinnedProducts.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-[11px] font-mono text-warm-400 w-5 shrink-0">{idx + 1}</span>
                {p.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumb} alt={p.name} className="w-10 h-10 rounded object-cover bg-warm-100 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-warm-100 shrink-0" />
                )}
                <span className="flex-1 text-sm text-warm-800 truncate">{p.name}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => movePinned(idx, -1)}
                    disabled={idx === 0}
                    title="Sposta su"
                    className="p-1.5 rounded hover:bg-warm-100 text-warm-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePinned(idx, 1)}
                    disabled={idx === pinnedProducts.length - 1}
                    title="Sposta giù"
                    className="p-1.5 rounded hover:bg-warm-100 text-warm-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePinned(p.id)}
                    title="Rimuovi dai prodotti in evidenza"
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-warm-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-warm-900">Aggiungi un prodotto in evidenza</div>
              <button type="button" onClick={() => setShowPicker(false)} className="text-warm-500 hover:text-warm-900 text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-3 border-b border-warm-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  type="text"
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder="Cerca per nome…"
                  className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-warm-500">
                  {availableForPicker.length === 0 ? "Tutti i prodotti pubblicati sono già in evidenza." : "Nessun prodotto trovato."}
                </div>
              ) : (
                <ul className="divide-y divide-warm-100">
                  {filtered.slice(0, 200).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { addPinned(p.id); setShowPicker(false); }}
                        className="w-full flex items-center gap-3 px-5 py-2 hover:bg-warm-50 text-left"
                      >
                        {p.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumb} alt={p.name} className="w-9 h-9 rounded object-cover bg-warm-100 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-warm-100 shrink-0" />
                        )}
                        <span className="text-sm text-warm-800">{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
