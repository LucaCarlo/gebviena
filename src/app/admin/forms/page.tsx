"use client";

import { useState, useEffect, useCallback } from "react";
import { GripVertical, Check, Plus, X, Trash2, Globe } from "lucide-react";

interface LanguageRow {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
  placeholder?: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Testo" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Telefono" },
  { value: "number", label: "Numero" },
  { value: "url", label: "URL" },
  { value: "textarea", label: "Testo lungo" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Selezione" },
];

const FORM_TYPE_LABELS: Record<string, string> = {
  info_request: "Richiesta Informazioni",
  store_contact: "Contatto Agente / Negozio",
  newsletter: "Newsletter",
  collaboration: "Collaborazioni",
};

const TABS_WITH_REASONS = ["info_request", "store_contact", "collaboration"];

export default function AdminFormsPage() {
  const [configs, setConfigs] = useState<{ formType: string; id?: string; fields: FieldConfig[] }[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // i18n
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [defaultLang, setDefaultLang] = useState("it");
  const [activeLang, setActiveLang] = useState("it");
  const [translatedFields, setTranslatedFields] = useState<FieldConfig[] | null>(null);
  const isTranslating = activeLang !== defaultLang;

  // Contact reasons state
  const [reasons, setReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState("");
  const [reasonDragIndex, setReasonDragIndex] = useState<number | null>(null);
  const [savingReasons, setSavingReasons] = useState(false);
  const [savedReasons, setSavedReasons] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/form-configs");
      const data = await res.json();
      if (data.success) {
        const parsed = data.data.map((c: { id: string; formType: string; fields: string }) => ({
          id: c.id,
          formType: c.formType,
          fields: JSON.parse(c.fields) as FieldConfig[],
        }));
        setConfigs(parsed);
        if (!activeTab && parsed.length > 0) {
          setActiveTab(parsed[0].formType);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [activeTab]);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch("/api/languages");
      const data = await res.json();
      if (data.success) {
        const langs = (data.data as LanguageRow[]).filter((l) => l.isActive);
        setLanguages(langs);
        const def = langs.find((l) => l.isDefault);
        if (def) {
          setDefaultLang(def.code);
          setActiveLang(def.code);
        }
      }
    } catch { /* silent */ }
  }, []);

  const fetchReasons = useCallback(async () => {
    try {
      const res = await fetch("/api/contact-reasons");
      const data = await res.json();
      if (data.success) {
        setReasons(data.data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchReasons();
    fetchLanguages();
  }, [fetchConfigs, fetchReasons, fetchLanguages]);

  // Load translation when lang changes (and not default)
  useEffect(() => {
    if (!activeTab || !isTranslating) {
      setTranslatedFields(null);
      return;
    }
    const c = configs.find((x) => x.formType === activeTab);
    if (!c?.id) return;
    fetch(`/api/form-configs/${c.id}/translations/${activeLang}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.fields) {
          try {
            const tr = JSON.parse(d.data.fields) as FieldConfig[];
            const byKey = new Map(tr.map((f) => [f.key, f]));
            setTranslatedFields(
              c.fields.map((f) => {
                const t = byKey.get(f.key);
                return t ? { ...f, label: t.label ?? f.label, placeholder: t.placeholder ?? f.placeholder } : { ...f };
              })
            );
          } catch {
            setTranslatedFields(c.fields.map((f) => ({ ...f })));
          }
        } else {
          // Start from IT structure so user has everything to translate
          setTranslatedFields(c.fields.map((f) => ({ ...f })));
        }
      })
      .catch(() => setTranslatedFields(c.fields.map((f) => ({ ...f }))));
  }, [activeTab, activeLang, isTranslating, configs]);

  const activeConfig = configs.find((c) => c.formType === activeTab);
  const displayedFields = isTranslating && translatedFields ? translatedFields : activeConfig?.fields;

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    if (isTranslating) {
      // In translation mode, only allow label/placeholder updates; write to translatedFields
      const allowed: Partial<FieldConfig> = {};
      if (typeof updates.label === "string") allowed.label = updates.label;
      if (typeof updates.placeholder === "string") allowed.placeholder = updates.placeholder;
      if (Object.keys(allowed).length === 0) return;
      setTranslatedFields((prev) => {
        if (!prev) return prev;
        return prev.map((f, i) => (i === index ? { ...f, ...allowed } : f));
      });
      setSaved(false);
      return;
    }
    setConfigs((prev) =>
      prev.map((c) =>
        c.formType === activeTab
          ? { ...c, fields: c.fields.map((f, i) => (i === index ? { ...f, ...updates } : f)) }
          : c
      )
    );
    setSaved(false);
  };

  const deleteField = (index: number) => {
    if (!confirm("Rimuovere questo campo? L'azione sarà definitiva al salvataggio.")) return;
    setConfigs((prev) =>
      prev.map((c) =>
        c.formType === activeTab
          ? { ...c, fields: c.fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })) }
          : c
      )
    );
    setSaved(false);
  };

  const addField = () => {
    if (!activeConfig) return;
    const existingKeys = new Set(activeConfig.fields.map((f) => f.key));
    let i = 1;
    let newKey = `custom_field_${i}`;
    while (existingKeys.has(newKey)) {
      i++;
      newKey = `custom_field_${i}`;
    }
    const newField: FieldConfig = {
      key: newKey,
      label: "Nuovo campo",
      type: "text",
      required: false,
      enabled: true,
      order: activeConfig.fields.length,
    };
    setConfigs((prev) =>
      prev.map((c) =>
        c.formType === activeTab ? { ...c, fields: [...c.fields, newField] } : c
      )
    );
    setSaved(false);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setConfigs((prev) =>
      prev.map((c) => {
        if (c.formType !== activeTab) return c;
        const newFields = [...c.fields];
        const [moved] = newFields.splice(dragIndex, 1);
        newFields.splice(index, 0, moved);
        return { ...c, fields: newFields.map((f, i) => ({ ...f, order: i })) };
      })
    );
    setDragIndex(index);
    setSaved(false);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSave = async () => {
    if (!activeConfig) return;
    setSaving(true);
    try {
      if (isTranslating && activeConfig.id && translatedFields) {
        const fieldsJson = JSON.stringify(translatedFields.map((f, i) => ({ ...f, order: i })));
        const res = await fetch(`/api/form-configs/${activeConfig.id}/translations/${activeLang}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: fieldsJson }),
        });
        const data = await res.json();
        if (data.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        const res = await fetch("/api/form-configs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formType: activeTab,
            fields: activeConfig.fields.map((f, i) => ({ ...f, order: i })),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  // --- Contact reasons handlers ---

  const handleReasonDragStart = (index: number) => {
    setReasonDragIndex(index);
  };

  const handleReasonDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (reasonDragIndex === null || reasonDragIndex === index) return;
    setReasons((prev) => {
      const newReasons = [...prev];
      const [moved] = newReasons.splice(reasonDragIndex, 1);
      newReasons.splice(index, 0, moved);
      return newReasons;
    });
    setReasonDragIndex(index);
    setSavedReasons(false);
  };

  const handleReasonDragEnd = () => {
    setReasonDragIndex(null);
  };

  const addReason = () => {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    setReasons((prev) => [...prev, trimmed]);
    setNewReason("");
    setSavedReasons(false);
  };

  const removeReason = (index: number) => {
    setReasons((prev) => prev.filter((_, i) => i !== index));
    setSavedReasons(false);
  };

  const updateReason = (index: number, value: string) => {
    setReasons((prev) => prev.map((r, i) => (i === index ? value : r)));
    setSavedReasons(false);
  };

  const handleSaveReasons = async () => {
    setSavingReasons(true);
    try {
      const res = await fetch("/api/contact-reasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasons }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedReasons(true);
        setTimeout(() => setSavedReasons(false), 2000);
      }
    } catch { /* silent */ }
    setSavingReasons(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900">Configurazione Forms</h1>
        <p className="text-sm text-warm-500 mt-1">
          Gestisci i campi dei form pubblici del sito
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {configs.map((c) => (
          <button
            key={c.formType}
            onClick={() => setActiveTab(c.formType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === c.formType
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            {FORM_TYPE_LABELS[c.formType] || c.formType}
          </button>
        ))}
      </div>

      {/* Language bar */}
      {languages.length > 1 && (
        <div className="bg-white rounded-xl border border-warm-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 uppercase tracking-wider">
            <Globe size={14} /> Lingua
          </div>
          <select
            value={activeLang}
            onChange={(e) => setActiveLang(e.target.value)}
            className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}{l.isDefault ? " (principale)" : ""}
              </option>
            ))}
          </select>
          {isTranslating && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
              Stai traducendo in <strong>{activeLang.toUpperCase()}</strong>. Puoi modificare solo etichette e placeholder; struttura e chiavi sono bloccate.
            </span>
          )}
        </div>
      )}

      {/* Fields */}
      {activeConfig && displayedFields && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200">
          <div className="divide-y divide-warm-100">
            {displayedFields.map((field, index) => (
              <div
                key={`${field.key}-${index}`}
                draggable={!isTranslating}
                onDragStart={() => !isTranslating && handleDragStart(index)}
                onDragOver={(e) => !isTranslating && handleDragOver(e, index)}
                onDragEnd={!isTranslating ? handleDragEnd : undefined}
                className={`px-4 py-4 transition-colors ${
                  dragIndex === index ? "bg-warm-50" : "hover:bg-warm-50/50"
                } ${!field.enabled ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`pt-2 ${isTranslating ? "opacity-30" : "cursor-grab active:cursor-grabbing"}`}>
                    <GripVertical size={16} className="text-warm-300" />
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Label */}
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Etichetta</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="w-full text-sm border border-warm-300 rounded px-2 py-1.5 focus:border-warm-800 focus:outline-none"
                      />
                    </div>

                    {/* Key */}
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Chiave</label>
                      <input
                        type="text"
                        value={field.key}
                        disabled={isTranslating}
                        onChange={(e) => updateField(index, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                        className="w-full text-sm border border-warm-300 rounded px-2 py-1.5 focus:border-warm-800 focus:outline-none font-mono disabled:bg-warm-100 disabled:text-warm-400"
                      />
                    </div>

                    {/* Type */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Tipo</label>
                      <select
                        value={field.type}
                        disabled={isTranslating}
                        onChange={(e) => updateField(index, { type: e.target.value })}
                        className="w-full text-sm border border-warm-300 rounded px-2 py-1.5 focus:border-warm-800 focus:outline-none bg-white disabled:bg-warm-100 disabled:text-warm-400"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Toggles */}
                    <div className="md:col-span-2 flex items-end gap-2 pb-1">
                      <button
                        type="button"
                        disabled={isTranslating}
                        onClick={() => !isTranslating && updateField(index, { required: !field.required })}
                        title={field.required ? "Obbligatorio" : "Opzionale"}
                        className={`flex-1 text-[10px] uppercase tracking-wider px-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          field.required
                            ? "bg-warm-800 border-warm-800 text-white"
                            : "border-warm-300 text-warm-500 hover:border-warm-500"
                        }`}
                      >
                        Obbl.
                      </button>
                      <button
                        type="button"
                        disabled={isTranslating}
                        onClick={() => !isTranslating && updateField(index, { enabled: !field.enabled })}
                        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                          field.enabled ? "bg-green-500" : "bg-warm-300"
                        }`}
                        title={field.enabled ? "Attivo" : "Disattivato"}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            field.enabled ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Placeholder (for text/textarea/select) */}
                    {(field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number" || field.type === "url" || field.type === "textarea") && (
                      <div className="md:col-span-12">
                        <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Placeholder (opzionale)</label>
                        <input
                          type="text"
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          className="w-full text-sm border border-warm-200 rounded px-2 py-1.5 focus:border-warm-800 focus:outline-none"
                          placeholder="Testo guida nel campo vuoto..."
                        />
                      </div>
                    )}
                  </div>

                  {!isTranslating && (
                    <button
                      type="button"
                      onClick={() => deleteField(index)}
                      className="text-warm-400 hover:text-red-600 transition-colors p-1"
                      title="Elimina campo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add field (disabled when translating) */}
          {!isTranslating && (
            <div className="p-4 border-t border-warm-100">
              <button
                type="button"
                onClick={addField}
                className="bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Aggiungi campo
              </button>
            </div>
          )}

          {/* Save button */}
          <div className="p-4 border-t border-warm-200 flex items-center justify-end gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check size={16} /> Salvato
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-warm-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
            >
              {saving ? "Salvataggio..." : "Salva configurazione"}
            </button>
          </div>
        </div>
      )}

      {/* Contact reasons section — only for non-newsletter tabs */}
      {activeTab && TABS_WITH_REASONS.includes(activeTab) && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-warm-200">
          <div className="p-4 border-b border-warm-200">
            <h2 className="text-lg font-semibold text-warm-900">Motivi di contatto</h2>
            <p className="text-xs text-warm-500 mt-0.5">
              Gestisci le opzioni del campo &quot;Motivo del contatto&quot; nei form
            </p>
          </div>

          <div className="divide-y divide-warm-100">
            {reasons.map((reason, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleReasonDragStart(index)}
                onDragOver={(e) => handleReasonDragOver(e, index)}
                onDragEnd={handleReasonDragEnd}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  reasonDragIndex === index ? "bg-warm-50" : "hover:bg-warm-50/50"
                }`}
              >
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} className="text-warm-300" />
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => updateReason(index, e.target.value)}
                  className="flex-1 text-sm text-warm-800 bg-transparent border-b border-transparent hover:border-warm-300 focus:border-warm-800 focus:outline-none px-1 py-0.5 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeReason(index)}
                  className="text-warm-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add reason */}
          <div className="p-4 border-t border-warm-100 flex items-center gap-3">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReason(); } }}
              placeholder="Aggiungi motivo..."
              className="flex-1 text-sm border border-warm-300 rounded-lg px-3 py-2 focus:border-warm-800 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={addReason}
              className="bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Aggiungi motivo
            </button>
          </div>

          {/* Save reasons button */}
          <div className="p-4 border-t border-warm-200 flex items-center justify-end gap-3">
            {savedReasons && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check size={16} /> Salvato
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveReasons}
              disabled={savingReasons}
              className="bg-warm-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
            >
              {savingReasons ? "Salvataggio..." : "Salva motivi"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
