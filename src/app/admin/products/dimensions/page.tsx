"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputClass = "w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800";
const labelClass = "block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5";
const btnPrimary = "flex items-center gap-2 bg-warm-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors";
const btnSecondary = "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 disabled:opacity-50 transition-colors";

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === "success"
        ? "bg-green-50 border border-green-200 text-green-800"
        : "bg-red-50 border border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DimensionBlock {
  id: string;
  name: string;
  labels: string;
  isActive: boolean;
  sortOrder: number;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DimensionsPage() {
  const [blocks, setBlocks] = useState<DimensionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLabels, setEditLabels] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const fetchBlocks = useCallback(async () => {
    const res = await fetch("/api/dimension-blocks");
    const data = await res.json();
    if (data.success) setBlocks(data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const startNew = () => {
    setEditing("new");
    setEditName("");
    setEditLabels([""]);
  };

  const startEdit = (block: DimensionBlock) => {
    setEditing(block.id);
    setEditName(block.name);
    try {
      setEditLabels(JSON.parse(block.labels));
    } catch {
      setEditLabels([""]);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditName("");
    setEditLabels([""]);
  };

  const addLabel = () => {
    if (editLabels.length < 6) setEditLabels([...editLabels, ""]);
  };

  const removeLabel = (i: number) => {
    setEditLabels(editLabels.filter((_, idx) => idx !== i));
  };

  const updateLabel = (i: number, val: string) => {
    const next = [...editLabels];
    next[i] = val;
    setEditLabels(next);
  };

  const handleSave = async () => {
    if (!editName.trim()) { showToast("Inserisci un nome per il blocco", "error"); return; }
    const filtered = editLabels.filter((l) => l.trim());
    if (filtered.length === 0) { showToast("Inserisci almeno un'etichetta", "error"); return; }

    setSaving(true);
    try {
      const url = editing === "new" ? "/api/dimension-blocks" : `/api/dimension-blocks/${editing}`;
      const method = editing === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), labels: filtered }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editing === "new" ? "Blocco creato" : "Blocco aggiornato", "success");
        cancelEdit();
        fetchBlocks();
      } else {
        showToast(data.error || "Errore", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo blocco dimensioni?")) return;
    const res = await fetch(`/api/dimension-blocks/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Blocco eliminato", "success");
      fetchBlocks();
    } else {
      showToast(data.error || "Errore", "error");
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Dimensioni</h1>
        <p className="text-sm text-warm-500 mt-1">Crea blocchi di misure riutilizzabili per i prodotti (max 6 misure per blocco).</p>
      </div>

      <div className="space-y-6">
        {/* Edit / Create form */}
        {editing && (
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                {editing === "new" ? "Nuovo blocco" : "Modifica blocco"}
              </h3>
              <button onClick={cancelEdit} className="text-warm-400 hover:text-warm-600"><X size={18} /></button>
            </div>

            <div>
              <label className={labelClass}>Nome blocco</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} placeholder="es. Sedia standard" />
            </div>

            <div>
              <label className={labelClass}>Etichette misure</label>
              <div className="space-y-2">
                {editLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => updateLabel(i, e.target.value)}
                      className={inputClass}
                      placeholder={`Misura ${i + 1} (es. Larghezza)`}
                    />
                    {editLabels.length > 1 && (
                      <button onClick={() => removeLabel(i)} className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editLabels.length < 6 && (
                <button onClick={addLabel} className="mt-2 flex items-center gap-1 text-xs text-warm-600 hover:text-warm-800">
                  <Plus size={14} /> Aggiungi misura
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing === "new" ? "Crea" : "Salva"}
              </button>
              <button onClick={cancelEdit} className={btnSecondary}>Annulla</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Blocchi esistenti</h3>
            {!editing && (
              <button onClick={startNew} className={btnPrimary}>
                <Plus size={16} /> Nuovo blocco
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-warm-400 text-sm py-4 text-center">Caricamento...</p>
          ) : blocks.length === 0 ? (
            <p className="text-warm-400 text-sm py-4 text-center">Nessun blocco dimensioni creato.</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => {
                let labels: string[] = [];
                try { labels = JSON.parse(block.labels); } catch { /* ignore */ }
                return (
                  <div key={block.id} className="flex items-center justify-between p-4 bg-warm-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-warm-800">{block.name}</p>
                      <p className="text-xs text-warm-500 mt-0.5">{labels.join(" × ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(block)} className="text-warm-400 hover:text-warm-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(block.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
