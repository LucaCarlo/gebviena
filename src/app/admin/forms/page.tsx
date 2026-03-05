"use client";

import { useState, useEffect, useCallback } from "react";
import { GripVertical, Check, Plus, X } from "lucide-react";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  info_request: "Richiesta Informazioni",
  store_contact: "Contatto Agente / Negozio",
  newsletter: "Newsletter",
  collaboration: "Collaborazioni",
};

const TYPE_BADGES: Record<string, string> = {
  text: "Testo",
  email: "Email",
  tel: "Telefono",
  textarea: "Testo lungo",
  checkbox: "Checkbox",
  select: "Selezione",
};

const TABS_WITH_REASONS = ["info_request", "store_contact", "collaboration"];

export default function AdminFormsPage() {
  const [configs, setConfigs] = useState<{ formType: string; fields: FieldConfig[] }[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
        const parsed = data.data.map((c: { formType: string; fields: string }) => ({
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
  }, [fetchConfigs, fetchReasons]);

  const activeConfig = configs.find((c) => c.formType === activeTab);

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.formType === activeTab
          ? { ...c, fields: c.fields.map((f, i) => (i === index ? { ...f, ...updates } : f)) }
          : c
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

      {/* Fields */}
      {activeConfig && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200">
          <div className="p-4 border-b border-warm-200">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-warm-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-4">Campo</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2 text-center">Obbligatorio</div>
              <div className="col-span-2 text-center">Attivo</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          <div className="divide-y divide-warm-100">
            {activeConfig.fields.map((field, index) => (
              <div
                key={field.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`grid grid-cols-12 gap-2 items-center px-4 py-3 transition-colors ${
                  dragIndex === index ? "bg-warm-50" : "hover:bg-warm-50/50"
                } ${!field.enabled ? "opacity-50" : ""}`}
              >
                {/* Drag handle */}
                <div className="col-span-1 flex justify-center cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} className="text-warm-300" />
                </div>

                {/* Label (editable) */}
                <div className="col-span-4">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="w-full text-sm text-warm-800 bg-transparent border-b border-transparent hover:border-warm-300 focus:border-warm-800 focus:outline-none px-1 py-0.5 transition-colors"
                  />
                  <span className="text-[10px] text-warm-400 px-1">{field.key}</span>
                </div>

                {/* Type badge */}
                <div className="col-span-2">
                  <span className="inline-block text-[10px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded">
                    {TYPE_BADGES[field.type] || field.type}
                  </span>
                </div>

                {/* Required toggle */}
                <div className="col-span-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => updateField(index, { required: !field.required })}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      field.required
                        ? "bg-warm-800 border-warm-800 text-white"
                        : "border-warm-300 hover:border-warm-500"
                    }`}
                  >
                    {field.required && <Check size={12} />}
                  </button>
                </div>

                {/* Enabled toggle */}
                <div className="col-span-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => updateField(index, { enabled: !field.enabled })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      field.enabled ? "bg-green-500" : "bg-warm-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        field.enabled ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Key (readonly) */}
                <div className="col-span-1" />
              </div>
            ))}
          </div>

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
