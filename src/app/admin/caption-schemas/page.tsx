"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";

// ============================================================================
// /admin/caption-schemas — Gestione delle 16 strutture didascalia FINISHES.
//
// Layout: elenco strutture a sinistra + editor a destra. L'editor mostra le
// parti (Struttura, Seduta, ...) con i loro attributi (Materiale, Finitura,
// ...); l'admin puo' aggiungere/rimuovere/riordinare parti+attributi e
// salvare. Le modifiche NON si applicano finche' non premi Salva.
// ============================================================================

interface CaptionAttribute {
  key: string;
  label: string;
}
interface CaptionPart {
  key: string;
  label: string;
  attributes: CaptionAttribute[];
}
interface CaptionType {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  partsJson: CaptionPart[];
}

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "voce";
}

export default function CaptionSchemasPage() {
  const [types, setTypes] = useState<CaptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CaptionType | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/caption-schemas");
    const d = await res.json();
    if (d.success) {
      setTypes(d.data);
      if (!selectedId && d.data.length > 0) setSelectedId(d.data[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { fetchList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Load selected as draft
  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    const t = types.find((x) => x.id === selectedId);
    if (t) {
      // Normalize partsJson (potrebbe arrivare come stringa da alcuni backend)
      let parts: CaptionPart[] = [];
      try {
        parts = Array.isArray(t.partsJson) ? t.partsJson : JSON.parse((t.partsJson as unknown as string) || "[]");
      } catch { parts = []; }
      setDraft({ ...t, partsJson: parts });
    }
  }, [selectedId, types]);

  const showToast = (msg: string, kind: "ok" | "err") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/caption-schemas/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label,
          partsJson: draft.partsJson,
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("Salvato", "ok");
        await fetchList();
      } else {
        showToast(d.error || "Errore salvataggio", "err");
      }
    } catch { showToast("Errore di connessione", "err"); }
    setSaving(false);
  };

  // ---- helper modifica parts/attributes nel draft ----
  const setParts = (updater: (prev: CaptionPart[]) => CaptionPart[]) => {
    setDraft((d) => (d ? { ...d, partsJson: updater(d.partsJson) } : d));
  };
  const addPart = () => setParts((p) => [...p, { key: `parte_${p.length + 1}`, label: "Nuova parte", attributes: [] }]);
  const removePart = (i: number) => setParts((p) => p.filter((_, idx) => idx !== i));
  const movePart = (i: number, dir: -1 | 1) => setParts((p) => {
    const next = [...p]; const j = i + dir;
    if (j < 0 || j >= next.length) return p;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const renamePart = (i: number, label: string) => setParts((p) => p.map((x, idx) => idx === i ? { ...x, label, key: slug(label) } : x));

  const addAttr = (partI: number) => setParts((p) => p.map((x, idx) => idx === partI ? { ...x, attributes: [...x.attributes, { key: `attr_${x.attributes.length + 1}`, label: "Nuovo attributo" }] } : x));
  const removeAttr = (partI: number, attrI: number) => setParts((p) => p.map((x, idx) => idx === partI ? { ...x, attributes: x.attributes.filter((_, ai) => ai !== attrI) } : x));
  const moveAttr = (partI: number, attrI: number, dir: -1 | 1) => setParts((p) => p.map((x, idx) => {
    if (idx !== partI) return x;
    const next = [...x.attributes]; const j = attrI + dir;
    if (j < 0 || j >= next.length) return x;
    [next[attrI], next[j]] = [next[j], next[attrI]];
    return { ...x, attributes: next };
  }));
  const renameAttr = (partI: number, attrI: number, label: string) => setParts((p) => p.map((x, idx) => idx === partI ? { ...x, attributes: x.attributes.map((a, ai) => ai === attrI ? { ...a, label, key: slug(label) } : a) } : x));

  const partsOfSelected: CaptionPart[] = useMemo(() => (draft?.partsJson || []), [draft]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-800">Strutture didascalie FINISHES</h1>
        <p className="text-sm text-warm-500 mt-1">
          Per ogni categoria di prodotto (Sedie, Sgabelli, Tavoli, ecc.) definisci quali parti mostrare
          nella card FINISHES sul sito e quali attributi ogni parte ha.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar sinistra: elenco strutture */}
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-100">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Categorie</p>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-warm-400">Caricamento...</div>
          ) : (
            <ul className="divide-y divide-warm-100 max-h-[70vh] overflow-y-auto">
              {types.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedId === t.id ? "bg-warm-100 text-warm-900 font-medium" : "text-warm-700 hover:bg-warm-50"
                    }`}
                  >
                    <div className="truncate">{t.label}</div>
                    <div className="text-[10px] text-warm-400 mt-0.5">{t.key}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor destra */}
        {draft ? (
          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 min-w-0 mr-4">
                <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Nome categoria</label>
                <input
                  type="text"
                  value={draft.label}
                  onChange={(e) => setDraft((d) => d ? { ...d, label: e.target.value } : d)}
                  className="w-full border-b border-warm-300 focus:border-warm-800 outline-none text-xl font-medium text-warm-900 pb-1 bg-transparent"
                />
                <p className="text-[10px] text-warm-400 mt-1">Chiave sistema: <code className="bg-warm-100 px-1">{draft.key}</code></p>
              </div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Salvo..." : "Salva"}
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Parti della didascalia</p>
              <button
                type="button"
                onClick={addPart}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-warm-300 text-warm-700 hover:bg-warm-50"
              >
                <Plus size={12} /> Aggiungi parte
              </button>
            </div>

            {partsOfSelected.length === 0 && (
              <p className="text-sm text-warm-400 italic p-4 border border-dashed border-warm-300 rounded">
                Nessuna parte ancora. Aggiungi la prima con &ldquo;Aggiungi parte&rdquo;.
              </p>
            )}

            <div className="space-y-4">
              {partsOfSelected.map((part, i) => (
                <div key={i} className="border border-warm-200 rounded-lg p-4 bg-warm-50">
                  {/* Header parte */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={part.label}
                      onChange={(e) => renamePart(i, e.target.value)}
                      className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm bg-white focus:border-warm-800 focus:outline-none font-medium"
                      placeholder="Nome parte (es. Struttura)"
                    />
                    <button type="button" onClick={() => movePart(i, -1)} disabled={i === 0} className="p-1.5 text-warm-500 hover:text-warm-900 disabled:opacity-30" aria-label="Sposta su">
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" onClick={() => movePart(i, 1)} disabled={i === partsOfSelected.length - 1} className="p-1.5 text-warm-500 hover:text-warm-900 disabled:opacity-30" aria-label="Sposta giu">
                      <ChevronDown size={14} />
                    </button>
                    <button type="button" onClick={() => removePart(i)} className="p-1.5 text-red-600 hover:text-red-800" aria-label="Elimina parte">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Attributi */}
                  <div className="pl-4 border-l-2 border-warm-200 space-y-2">
                    {part.attributes.map((attr, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={attr.label}
                          onChange={(e) => renameAttr(i, ai, e.target.value)}
                          className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm bg-white focus:border-warm-800 focus:outline-none"
                          placeholder="Nome attributo (es. Materiale)"
                        />
                        <button type="button" onClick={() => moveAttr(i, ai, -1)} disabled={ai === 0} className="p-1 text-warm-400 hover:text-warm-700 disabled:opacity-30">
                          <ChevronUp size={12} />
                        </button>
                        <button type="button" onClick={() => moveAttr(i, ai, 1)} disabled={ai === part.attributes.length - 1} className="p-1 text-warm-400 hover:text-warm-700 disabled:opacity-30">
                          <ChevronDown size={12} />
                        </button>
                        <button type="button" onClick={() => removeAttr(i, ai)} className="p-1 text-red-500 hover:text-red-700">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addAttr(i)}
                      className="flex items-center gap-1 text-[11px] text-warm-600 hover:text-warm-900 mt-1"
                    >
                      <Plus size={11} /> Aggiungi attributo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-warm-200 p-6 text-warm-400 text-sm">
            Seleziona una categoria dall&apos;elenco a sinistra per modificarne la struttura.
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-sm text-white z-50 ${
            toast.kind === "ok" ? "bg-green-700" : "bg-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
