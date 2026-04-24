"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle } from "lucide-react";

type AttrType = "MATERIAL" | "FINISH" | "COLOR" | "OTHER";

interface AttrTranslation {
  id?: string;
  languageCode: string;
  label: string;
}

interface AttrValue {
  id: string;
  type: AttrType;
  code: string;
  hexColor: string | null;
  sortOrder: number;
  isActive: boolean;
  translations: AttrTranslation[];
}

interface Language {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

const TYPE_LABELS: Record<AttrType, string> = {
  MATERIAL: "Materiali",
  FINISH: "Finiture",
  COLOR: "Colori",
  OTHER: "Altro",
};

const EMPTY_FORM: Omit<AttrValue, "id"> = {
  type: "MATERIAL",
  code: "",
  hexColor: null,
  sortOrder: 0,
  isActive: true,
  translations: [],
};

export default function StoreAttributesPage() {
  const [values, setValues] = useState<AttrValue[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeTab, setActiveTab] = useState<AttrType>("MATERIAL");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AttrValue | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [valsRes, langRes] = await Promise.all([
      fetch("/api/store/attributes").then((r) => r.json()),
      fetch("/api/languages").then((r) => r.json()),
    ]);
    if (valsRes.success) setValues(valsRes.data);
    if (langRes.success) setLanguages(langRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(
    () => values.filter((v) => v.type === activeTab).sort((a, b) => a.sortOrder - b.sortOrder),
    [values, activeTab]
  );

  const ensureTranslations = (existing: AttrTranslation[]) => {
    const map = new Map(existing.map((t) => [t.languageCode, t]));
    return languages.map((l) => ({
      languageCode: l.code,
      label: map.get(l.code)?.label ?? "",
    }));
  };

  const startNew = () => {
    setNewForm({ ...EMPTY_FORM, type: activeTab, translations: ensureTranslations([]) });
    setShowNew(true);
  };

  const handleCreate = async () => {
    if (!newForm.code.trim()) return showToast("Codice obbligatorio", false);
    setSaving(true);
    try {
      const res = await fetch("/api/store/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          translations: newForm.translations.filter((t) => t.label.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setValues((v) => [...v, data.data]);
        setShowNew(false);
        showToast("Creato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/store/attributes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editing.type,
          code: editing.code,
          hexColor: editing.hexColor,
          sortOrder: editing.sortOrder,
          isActive: editing.isActive,
          translations: editing.translations.filter((t) => t.label.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setValues((vs) => vs.map((v) => (v.id === editing.id ? data.data : v)));
        setEditing(null);
        showToast("Aggiornato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancellare questo valore?")) return;
    const res = await fetch(`/api/store/attributes/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setValues((v) => v.filter((x) => x.id !== id));
      showToast("Cancellato", true);
    } else {
      showToast(data.error || "Errore", false);
    }
  };

  const startEdit = (v: AttrValue) => {
    setEditing({ ...v, translations: ensureTranslations(v.translations) });
  };

  return (
    <div className="max-w-6xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">Attributi Store</h1>
          <p className="text-sm text-warm-500 mt-1">
            Materiali, finiture, colori e altri attributi usati dalle varianti prodotto.
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 transition-colors text-sm"
        >
          <Plus size={16} /> Nuovo
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-warm-200 mb-6">
        {(Object.keys(TYPE_LABELS) as AttrType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === t
                ? "border-warm-900 text-warm-900 font-medium"
                : "border-transparent text-warm-500 hover:text-warm-700"
            }`}
          >
            {TYPE_LABELS[t]} ({values.filter((v) => v.type === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun valore per {TYPE_LABELS[activeTab]}. Clicca &quot;Nuovo&quot;.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Codice</th>
                <th className="px-4 py-3 text-left">Etichette</th>
                {activeTab === "COLOR" && <th className="px-4 py-3 text-left">Colore</th>}
                <th className="px-4 py-3 text-left">Ordine</th>
                <th className="px-4 py-3 text-left">Attivo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-warm-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-warm-700">{v.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.translations.map((t) => (
                        <span
                          key={t.languageCode}
                          className="inline-flex items-center gap-1 text-xs bg-warm-100 px-2 py-0.5 rounded"
                        >
                          <span className="text-warm-400 uppercase">{t.languageCode}</span>
                          <span className="text-warm-800">{t.label}</span>
                        </span>
                      ))}
                      {v.translations.length === 0 && (
                        <span className="text-warm-400 text-xs italic">nessuna traduzione</span>
                      )}
                    </div>
                  </td>
                  {activeTab === "COLOR" && (
                    <td className="px-4 py-3">
                      {v.hexColor ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded border border-warm-200"
                            style={{ backgroundColor: v.hexColor }}
                          />
                          <span className="font-mono text-xs text-warm-600">{v.hexColor}</span>
                        </div>
                      ) : (
                        <span className="text-warm-400 text-xs">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-warm-600">{v.sortOrder}</td>
                  <td className="px-4 py-3">
                    {v.isActive ? (
                      <Check size={16} className="text-emerald-600" />
                    ) : (
                      <X size={16} className="text-warm-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => startEdit(v)}
                        className="p-1.5 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded"
                        title="Modifica"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Cancella"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New modal */}
      {showNew && (
        <AttrModal
          title="Nuovo valore"
          value={{ id: "", ...newForm }}
          languages={languages}
          onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
          onCancel={() => setShowNew(false)}
          onSave={handleCreate}
          saving={saving}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <AttrModal
          title="Modifica valore"
          value={editing}
          languages={languages}
          onChange={(patch) => setEditing((e) => (e ? { ...e, ...patch } : e))}
          onCancel={() => setEditing(null)}
          onSave={handleUpdate}
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

function AttrModal({
  title,
  value,
  languages,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  title: string;
  value: AttrValue;
  languages: Language[];
  onChange: (patch: Partial<AttrValue>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const updateTranslation = (languageCode: string, label: string) => {
    const existing = value.translations;
    const idx = existing.findIndex((t) => t.languageCode === languageCode);
    const next =
      idx >= 0
        ? existing.map((t, i) => (i === idx ? { ...t, label } : t))
        : [...existing, { languageCode, label }];
    onChange({ translations: next });
  };

  const getLabel = (code: string) =>
    value.translations.find((t) => t.languageCode === code)?.label ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
          <h2 className="font-semibold text-warm-900">{title}</h2>
          <button onClick={onCancel} className="text-warm-400 hover:text-warm-900">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Tipo</label>
            <select
              value={value.type}
              onChange={(e) => onChange({ type: e.target.value as AttrType })}
              className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
            >
              <option value="MATERIAL">Materiale</option>
              <option value="FINISH">Finitura</option>
              <option value="COLOR">Colore</option>
              <option value="OTHER">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">
              Codice <span className="text-warm-400 font-normal">(a-z 0-9 _ -)</span>
            </label>
            <input
              value={value.code}
              onChange={(e) => onChange({ code: e.target.value.toLowerCase() })}
              placeholder="es. noce, satinato, rosso-rubino"
              className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
            />
          </div>

          {value.type === "COLOR" && (
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">HEX</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={value.hexColor || "#000000"}
                  onChange={(e) => onChange({ hexColor: e.target.value })}
                  className="h-10 w-14 border border-warm-200 rounded-lg cursor-pointer"
                />
                <input
                  value={value.hexColor || ""}
                  onChange={(e) => onChange({ hexColor: e.target.value || null })}
                  placeholder="#c8102e"
                  className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Ordine</label>
              <input
                type="number"
                value={value.sortOrder}
                onChange={(e) => onChange({ sortOrder: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-warm-700 mt-5">
                <input
                  type="checkbox"
                  checked={value.isActive}
                  onChange={(e) => onChange({ isActive: e.target.checked })}
                />
                Attivo
              </label>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-warm-600 mb-2">Traduzioni</div>
            <div className="space-y-2">
              {languages.map((l) => (
                <div key={l.code} className="flex items-center gap-2">
                  <span className="w-12 text-xs uppercase text-warm-500 font-medium">{l.code}</span>
                  <input
                    value={getLabel(l.code)}
                    onChange={(e) => updateTranslation(l.code, e.target.value)}
                    placeholder={`Etichetta ${l.name}`}
                    className="flex-1 px-3 py-1.5 border border-warm-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900"
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
