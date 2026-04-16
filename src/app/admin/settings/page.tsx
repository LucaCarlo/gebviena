"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Shield,
  Globe,
  BarChart3,
  Database,
  Cloud,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Loader2,
  Languages,
  Share2,
  MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StatsData {
  tables: Record<string, number>;
  storage: {
    totalSize: number;
    totalOriginalSize: number;
    spaceSaved: number;
    optimizationPercent: number;
  };
  media: {
    images: number;
    others: number;
    synced: number;
    unsynced: number;
  };
  disk: {
    grandTotal: number;
    cwdTotal: number;
    uploadsTotal: number;
    uploadsCount: number;
    uploadsByType: Record<string, { count: number; size: number }>;
    largestFiles: Array<{ name: string; size: number; path: string }>;
    publicTotal: number;
    nextTotal: number;
    nodeModulesTotal: number;
    sourceOther: number;
    dbSize: number;
    dbTables: number;
  };
}

interface BackupPreview {
  [key: string]: number;
}

type TabKey = "smtp" | "recaptcha" | "languages" | "translations" | "social" | "maps" | "stats" | "backup" | "storage";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: "smtp", label: "Email / SMTP", icon: Mail },
  { key: "recaptcha", label: "reCAPTCHA", icon: Shield },
  { key: "languages", label: "Lingue", icon: Globe },
  { key: "translations", label: "Traduzioni AI", icon: Languages },
  { key: "social", label: "Social", icon: Share2 },
  { key: "maps", label: "Google Maps", icon: MapPin },
  { key: "stats", label: "Statistiche", icon: BarChart3 },
  { key: "backup", label: "Backup", icon: Database },
  { key: "storage", label: "Storage Cloud", icon: Cloud },
];

// ─── Toast Component ─────────────────────────────────────────────────────────

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

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-warm-800" : "bg-warm-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const TABLE_LABELS: Record<string, string> = {
  products: "Prodotti",
  designers: "Designer",
  projects: "Progetti",
  campaigns: "Campagne",
  awards: "Premi",
  heroSlides: "Hero Slides",
  languages: "Lingue",
  pointsOfSale: "Punti vendita",
  newsletterSubscribers: "Newsletter",
  contactSubmissions: "Messaggi",
  settings: "Impostazioni",
  mediaFiles: "Media",
  adminUsers: "Utenti admin",
  projectProducts: "Prodotti-Progetti",
};

// ─── Input styles ────────────────────────────────────────────────────────────

const inputClass = "w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800";
const labelClass = "block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5";
const btnPrimary = "flex items-center gap-2 bg-warm-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors";
const btnSecondary = "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 disabled:opacity-50 transition-colors";

// ─── SMTP Tab ────────────────────────────────────────────────────────────────

function SmtpTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: "false",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_name: "",
    smtp_from_email: "",
    admin_email: "",
    brevo_api_key: "",
  });
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=smtp")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "smtp" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Impostazioni SMTP salvate", "success");
      } else {
        showToast(data.error || "Errore nel salvataggio", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.data.message, "success");
      } else {
        showToast(data.error || "Test fallito", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTesting(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Configurazione Email / SMTP</h2>
        <p className="text-sm text-warm-500 mt-1">Configura il server SMTP per l&apos;invio delle email dal sito.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Host SMTP</label>
            <input type="text" value={form.smtp_host} onChange={(e) => update("smtp_host", e.target.value)} className={inputClass} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelClass}>Porta</label>
            <input type="text" value={form.smtp_port} onChange={(e) => update("smtp_port", e.target.value)} className={inputClass} placeholder="587" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={form.smtp_secure === "true"} onChange={(v) => update("smtp_secure", v ? "true" : "false")} id="smtp_secure" />
          <label htmlFor="smtp_secure" className="text-sm text-warm-600">Connessione sicura (SSL/TLS)</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Utente SMTP</label>
            <input type="text" value={form.smtp_user} onChange={(e) => update("smtp_user", e.target.value)} className={inputClass} placeholder="user@gmail.com" />
          </div>
          <div>
            <label className={labelClass}>Password SMTP</label>
            <input type="password" value={form.smtp_pass} onChange={(e) => update("smtp_pass", e.target.value)} className={inputClass} placeholder="********" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome mittente</label>
            <input type="text" value={form.smtp_from_name} onChange={(e) => update("smtp_from_name", e.target.value)} className={inputClass} placeholder="GTV" />
          </div>
          <div>
            <label className={labelClass}>Email mittente</label>
            <input type="text" value={form.smtp_from_email} onChange={(e) => update("smtp_from_email", e.target.value)} className={inputClass} placeholder="noreply@gtv.it" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email amministratore (per notifiche)</label>
          <input type="email" value={form.admin_email} onChange={(e) => update("admin_email", e.target.value)} className={inputClass} placeholder="admin@gebvienna.com" />
          <p className="text-xs text-warm-400 mt-1">Riceverà le notifiche di contatto e messaggi dal sito.</p>
        </div>

        <div className="border-t border-warm-200 pt-5 mt-5">
          <label className={labelClass}>Brevo API Key (opzionale)</label>
          <input type="password" value={form.brevo_api_key} onChange={(e) => update("brevo_api_key", e.target.value)} className={inputClass} placeholder="xkeysib-..." />
          <p className="text-xs text-warm-400 mt-1">Se configurata, le email verranno inviate tramite API Brevo invece che via SMTP.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
        <div className="flex items-end gap-2">
          <div>
            <label className={labelClass}>Destinatario test</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 w-64"
              placeholder="email@esempio.com"
            />
          </div>
          <button onClick={handleTest} disabled={testing} className={btnSecondary}>
            {testing && <Loader2 size={16} className="animate-spin" />}
            Invia email di test
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── reCAPTCHA Tab ───────────────────────────────────────────────────────────

function RecaptchaTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    recaptcha_enabled: "false",
    recaptcha_site_key: "",
    recaptcha_api_key: "",
    recaptcha_project_id: "",
    recaptcha_score_threshold: "0.5",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=recaptcha")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "recaptcha" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Impostazioni reCAPTCHA salvate", "success");
      } else {
        showToast(data.error || "Errore nel salvataggio", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const threshold = parseFloat(form.recaptcha_score_threshold) || 0.5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Configurazione reCAPTCHA Enterprise</h2>
        <p className="text-sm text-warm-500 mt-1">Proteggi i form del sito dallo spam con Google reCAPTCHA Enterprise.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Toggle checked={form.recaptcha_enabled === "true"} onChange={(v) => update("recaptcha_enabled", v ? "true" : "false")} id="recaptcha_enabled" />
          <label htmlFor="recaptcha_enabled" className="text-sm text-warm-600">Abilita reCAPTCHA Enterprise</label>
        </div>

        <div>
          <label className={labelClass}>Site Key</label>
          <input type="text" value={form.recaptcha_site_key} onChange={(e) => update("recaptcha_site_key", e.target.value)} className={inputClass} placeholder="6Le..." />
        </div>

        <div>
          <label className={labelClass}>API Key</label>
          <input type="password" value={form.recaptcha_api_key} onChange={(e) => update("recaptcha_api_key", e.target.value)} className={inputClass} placeholder="AIza..." />
          <p className="text-xs text-warm-400 mt-1">Chiave API di Google Cloud per reCAPTCHA Enterprise.</p>
        </div>

        <div>
          <label className={labelClass}>Project ID</label>
          <input type="text" value={form.recaptcha_project_id} onChange={(e) => update("recaptcha_project_id", e.target.value)} className={inputClass} placeholder="my-project-123" />
          <p className="text-xs text-warm-400 mt-1">ID del progetto Google Cloud.</p>
        </div>

        <div>
          <label className={labelClass}>Soglia punteggio ({threshold.toFixed(1)})</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={form.recaptcha_score_threshold}
            onChange={(e) => update("recaptcha_score_threshold", e.target.value)}
            className="w-full accent-warm-800"
          />
          <div className="flex justify-between text-xs text-warm-400 mt-1">
            <span>0.1 (permissivo)</span>
            <span>1.0 (solo umani)</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
      </div>
    </div>
  );
}

// ─── Languages Tab ───────────────────────────────────────────────────────────

interface LangRow {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flag: string | null;
  urlPrefix: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

function LanguagesTab() {
  const [langs, setLangs] = useState<LangRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<LangRow>>({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Partial<LangRow>>({ code: "", name: "", flag: "", urlPrefix: "", isActive: true, isDefault: false, sortOrder: 0 });
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const res = await fetch("/api/languages");
    const data = await res.json();
    if (data.success) setLangs(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const startEdit = (l: LangRow) => {
    setEditingId(l.id);
    setDraft({ ...l });
  };

  const handleSave = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/languages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setEditingId(null);
        fetchAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (l: LangRow) => {
    if (l.isDefault) { alert("Non puoi eliminare la lingua principale"); return; }
    if (!confirm(`Eliminare la lingua "${l.name}"?`)) return;
    await fetch(`/api/languages/${l.id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleCreate = async () => {
    if (!newForm.code || !newForm.name) { alert("Codice e nome obbligatori"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        setShowNew(false);
        setNewForm({ code: "", name: "", flag: "", urlPrefix: "", isActive: true, isDefault: false, sortOrder: 0 });
        fetchAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "border border-warm-300 rounded px-2 py-1 text-sm w-full focus:border-warm-800 focus:outline-none";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-warm-800">Lingue del sito</h2>
          <p className="text-sm text-warm-500 mt-1">Configura le lingue, imposta la principale e i prefissi URL.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900">+ Nuova lingua</button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">Nuova lingua</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div><label className="block text-[10px] uppercase text-warm-500 mb-1">Bandiera</label><input value={newForm.flag || ""} onChange={(e) => setNewForm((p) => ({ ...p, flag: e.target.value }))} className={inputCls} placeholder="🇪🇸" /></div>
            <div><label className="block text-[10px] uppercase text-warm-500 mb-1">Nome *</label><input value={newForm.name || ""} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Spagnolo" /></div>
            <div><label className="block text-[10px] uppercase text-warm-500 mb-1">Codice *</label><input value={newForm.code || ""} onChange={(e) => setNewForm((p) => ({ ...p, code: e.target.value.toLowerCase() }))} className={inputCls} placeholder="es" maxLength={5} /></div>
            <div><label className="block text-[10px] uppercase text-warm-500 mb-1">Prefisso URL</label><input value={newForm.urlPrefix || ""} onChange={(e) => setNewForm((p) => ({ ...p, urlPrefix: e.target.value.toLowerCase() }))} className={inputCls} placeholder="es" maxLength={5} /></div>
            <div><label className="block text-[10px] uppercase text-warm-500 mb-1">Ordine</label><input type="number" value={newForm.sortOrder || 0} onChange={(e) => setNewForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={busy} className="bg-warm-800 text-white px-4 py-1.5 rounded text-sm hover:bg-warm-900 disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin inline" /> : "Crea"}</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 rounded text-sm text-warm-600 border border-warm-300 hover:bg-warm-100">Annulla</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Bandiera</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Nome</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Codice</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Prefisso URL</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Principale</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Attiva</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Ordine</th>
                <th className="px-4 py-2 w-24 text-right text-[10px] font-semibold text-warm-600 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {langs.map((l) => (
                <tr key={l.id} className="hover:bg-warm-50">
                  {editingId === l.id ? (
                    <>
                      <td className="px-4 py-2"><input value={draft.flag || ""} onChange={(e) => setDraft((p) => ({ ...p, flag: e.target.value }))} className={inputCls + " w-16"} /></td>
                      <td className="px-4 py-2"><input value={draft.name || ""} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className={inputCls} /></td>
                      <td className="px-4 py-2"><input value={draft.code || ""} onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value.toLowerCase() }))} className={inputCls + " w-20"} maxLength={5} /></td>
                      <td className="px-4 py-2"><input value={draft.urlPrefix || ""} onChange={(e) => setDraft((p) => ({ ...p, urlPrefix: e.target.value.toLowerCase() || null }))} className={inputCls + " w-20"} maxLength={5} placeholder="(default)" /></td>
                      <td className="px-4 py-2"><input type="checkbox" checked={!!draft.isDefault} onChange={(e) => setDraft((p) => ({ ...p, isDefault: e.target.checked }))} /></td>
                      <td className="px-4 py-2"><input type="checkbox" checked={!!draft.isActive} onChange={(e) => setDraft((p) => ({ ...p, isActive: e.target.checked }))} /></td>
                      <td className="px-4 py-2"><input type="number" value={draft.sortOrder || 0} onChange={(e) => setDraft((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} className={inputCls + " w-16"} /></td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleSave(l.id)} disabled={busy} className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}</button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-warm-400 hover:text-warm-800">✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-2xl">{l.flag || "🏳"}</td>
                      <td className="px-4 py-2 font-medium text-warm-800">{l.name}</td>
                      <td className="px-4 py-2 text-warm-600 uppercase font-mono text-xs">{l.code}</td>
                      <td className="px-4 py-2 text-warm-600 font-mono text-xs">{l.urlPrefix || <span className="text-warm-400 italic">(no prefix)</span>}</td>
                      <td className="px-4 py-2">{l.isDefault && <span className="px-2 py-0.5 bg-warm-800 text-white text-[10px] rounded">Default</span>}</td>
                      <td className="px-4 py-2"><span className={`inline-block w-2 h-2 rounded-full ${l.isActive ? "bg-green-500" : "bg-red-400"}`} /></td>
                      <td className="px-4 py-2 text-warm-500 text-xs">{l.sortOrder}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => startEdit(l)} title="Modifica" className="p-1 text-warm-400 hover:text-warm-800">✎</button>
                        <button onClick={() => handleDelete(l)} title="Elimina" className="p-1 text-warm-400 hover:text-red-600">🗑</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {langs.length === 0 && <div className="text-center py-12 text-warm-400">Nessuna lingua</div>}
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ───────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-warm-400 py-12 text-center">Caricamento statistiche...</div>;
  }

  if (!stats) {
    return <div className="text-red-500 py-12 text-center">Errore nel caricamento delle statistiche</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Statistiche del sito</h2>
        <p className="text-sm text-warm-500 mt-1">Panoramica dei dati presenti nel database.</p>
      </div>

      {/* Record counts */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-4">Record per tabella</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Object.entries(stats.tables).map(([key, count]) => (
            <div key={key} className="bg-warm-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-warm-800">{count}</div>
              <div className="text-xs text-warm-500 mt-1">{TABLE_LABELS[key] || key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Storage stats */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-4">Storage Media</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{formatBytes(stats.storage.totalSize)}</div>
            <div className="text-xs text-warm-500 mt-1">Dimensione totale</div>
          </div>
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{formatBytes(stats.storage.totalOriginalSize)}</div>
            <div className="text-xs text-warm-500 mt-1">Dimensione originale</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{formatBytes(stats.storage.spaceSaved)}</div>
            <div className="text-xs text-green-600 mt-1">Spazio risparmiato</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.storage.optimizationPercent}%</div>
            <div className="text-xs text-green-600 mt-1">Ottimizzazione</div>
          </div>
        </div>
      </div>

      {/* Media counts */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-4">File Media (tabella DB)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{stats.media.images}</div>
            <div className="text-xs text-warm-500 mt-1">Immagini</div>
          </div>
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{stats.media.others}</div>
            <div className="text-xs text-warm-500 mt-1">Altri file</div>
          </div>
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{stats.media.synced}</div>
            <div className="text-xs text-warm-500 mt-1">Sincronizzati Wasabi</div>
          </div>
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{stats.media.unsynced}</div>
            <div className="text-xs text-warm-500 mt-1">Non sincronizzati</div>
          </div>
        </div>
      </div>

      {/* Disk usage overview */}
      {stats.disk && (() => {
        const components = [
          { key: "public", label: "public/ (assets)", size: stats.disk.publicTotal, color: "bg-blue-500" },
          { key: "next", label: ".next/ (build)", size: stats.disk.nextTotal, color: "bg-purple-500" },
          { key: "node_modules", label: "node_modules/", size: stats.disk.nodeModulesTotal, color: "bg-amber-500" },
          { key: "source", label: "codice + config", size: stats.disk.sourceOther, color: "bg-emerald-500" },
          { key: "db", label: "database MySQL", size: stats.disk.dbSize, color: "bg-rose-500" },
        ];
        const gb = (bytes: number) => (bytes / (1024 ** 3)).toFixed(2);
        return (
          <>
            {/* Totale sito */}
            <div className="bg-gradient-to-br from-warm-800 to-warm-900 text-white rounded-xl shadow-sm p-6">
              <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Totale sito sul server</div>
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-bold">{gb(stats.disk.grandTotal)}</div>
                <div className="text-2xl opacity-80">GB</div>
                <div className="text-sm opacity-60 ml-auto">({formatBytes(stats.disk.grandTotal)})</div>
              </div>
              <div className="mt-5 flex h-2.5 rounded-full overflow-hidden bg-white/10">
                {components.map((c) => {
                  const pct = stats.disk.grandTotal > 0 ? (c.size / stats.disk.grandTotal) * 100 : 0;
                  return <div key={c.key} className={c.color} style={{ width: `${pct}%` }} title={`${c.label}: ${formatBytes(c.size)}`} />;
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                {components.map((c) => {
                  const pct = stats.disk.grandTotal > 0 ? Math.round((c.size / stats.disk.grandTotal) * 100) : 0;
                  return (
                    <div key={c.key} className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${c.color}`} />
                        <span className="text-[10px] uppercase tracking-wider opacity-70">{c.label}</span>
                      </div>
                      <div className="text-lg font-bold">{formatBytes(c.size)}</div>
                      <div className="text-[10px] opacity-60">{pct}% del totale</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uploads dettaglio */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Uploads caricati dall&apos;utente</h3>
                <span className="text-xs text-warm-500">{stats.disk.uploadsCount} file · {formatBytes(stats.disk.uploadsTotal)}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(["images", "videos", "pdf", "archives", "other"] as const).map((key) => {
                  const labels: Record<string, string> = {
                    images: "Immagini",
                    videos: "Video",
                    pdf: "PDF",
                    archives: "ZIP/Archivi",
                    other: "Altro",
                  };
                  const bucket = stats.disk.uploadsByType[key] || { count: 0, size: 0 };
                  const pct = stats.disk.uploadsTotal > 0 ? Math.round((bucket.size / stats.disk.uploadsTotal) * 100) : 0;
                  return (
                    <div key={key} className="bg-warm-50 rounded-lg p-4">
                      <div className="text-xs text-warm-500 uppercase tracking-wider mb-2">{labels[key]}</div>
                      <div className="text-xl font-bold text-warm-800">{formatBytes(bucket.size)}</div>
                      <div className="text-[11px] text-warm-500 mt-1">{bucket.count} file · {pct}%</div>
                      <div className="mt-2 h-1.5 bg-white rounded overflow-hidden">
                        <div className="h-full bg-warm-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 10 */}
            {stats.disk.largestFiles.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
                <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-4">Top 10 file più grandi</h3>
                <div className="space-y-1.5">
                  {stats.disk.largestFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-warm-100 last:border-0">
                      <div className="w-6 text-warm-400 text-xs font-mono">#{i + 1}</div>
                      <div className="flex-1 font-mono text-warm-700 truncate text-xs" title={f.path}>{f.path}</div>
                      <div className="w-24 text-right font-mono text-warm-800 font-semibold">{formatBytes(f.size)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

// ─── Backup Tab ──────────────────────────────────────────────────────────────

function BackupTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/backup");
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gtv-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Backup esportato con successo", "success");
      } else {
        showToast(data.error || "Errore nell'esportazione", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const backupData = json.data || json;
        setImportData(backupData);

        // Build preview counts
        const counts: BackupPreview = {};
        for (const [key, value] of Object.entries(backupData)) {
          if (Array.isArray(value)) {
            counts[key] = value.length;
          }
        }
        setPreview(counts);
      } catch {
        showToast("File JSON non valido", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;
    if (!confirm("ATTENZIONE: Tutti i dati esistenti verranno sostituiti con quelli importati. Continuare?")) return;

    setImporting(true);
    try {
      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importData }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Database importato con successo", "success");
        setPreview(null);
        setImportData(null);
      } else {
        showToast(data.error || "Errore nell'importazione", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Backup & Ripristino</h2>
        <p className="text-sm text-warm-500 mt-1">Esporta o importa tutti i dati del database in formato JSON.</p>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Esporta Database</h3>
        <p className="text-sm text-warm-500">
          Scarica un backup completo di tutti i dati del database in formato JSON.
        </p>
        <button onClick={handleExport} disabled={exporting} className={btnPrimary}>
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? "Esportazione..." : "Esporta Backup"}
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Importa Database</h3>
        <p className="text-sm text-warm-500">
          Carica un file JSON di backup per ripristinare il database. Tutti i dati esistenti verranno sostituiti.
        </p>

        <div>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-warm-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-warm-100 file:text-warm-700 hover:file:bg-warm-200 file:cursor-pointer file:transition-colors"
          />
        </div>

        {preview && (
          <div className="bg-warm-50 border border-warm-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-warm-800 uppercase tracking-wider mb-3">Anteprima importazione</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(preview).map(([key, count]) => (
                <div key={key} className="flex justify-between text-sm bg-white px-3 py-2 rounded border border-warm-200">
                  <span className="text-warm-600">{TABLE_LABELS[key] || key}</span>
                  <span className="font-semibold text-warm-800">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={handleImport} disabled={importing} className={`${btnPrimary} bg-red-700 hover:bg-red-800`}>
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? "Importazione..." : "Conferma Importazione"}
              </button>
              <button
                onClick={() => { setPreview(null); setImportData(null); }}
                className={btnSecondary}
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Social Tab ──────────────────────────────────────────────────────────────

function SocialTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    social_facebook_url: "",
    social_instagram_url: "",
    social_pinterest_url: "",
    social_linkedin_url: "",
    social_youtube_url: "",
    social_twitter_url: "",
    social_tiktok_url: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=social")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "social" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) showToast("Social salvati. Aggiorna il frontend (Ctrl+F5) per vederli.", "success");
      else showToast(data.error || "Errore nel salvataggio", "error");
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const SOCIALS: Array<{ key: keyof typeof form; label: string; placeholder: string }> = [
    { key: "social_facebook_url", label: "Facebook", placeholder: "https://www.facebook.com/..." },
    { key: "social_instagram_url", label: "Instagram", placeholder: "https://www.instagram.com/..." },
    { key: "social_pinterest_url", label: "Pinterest", placeholder: "https://www.pinterest.com/..." },
    { key: "social_linkedin_url", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/..." },
    { key: "social_youtube_url", label: "YouTube", placeholder: "https://www.youtube.com/@..." },
    { key: "social_twitter_url", label: "X / Twitter", placeholder: "https://x.com/..." },
    { key: "social_tiktok_url", label: "TikTok", placeholder: "https://www.tiktok.com/@..." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Link Social</h2>
        <p className="text-sm text-warm-500 mt-1">Gli URL vengono usati nella colonna &ldquo;Seguici&rdquo; del footer. Lascia vuoto per nascondere il social.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        {SOCIALS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className={labelClass}>{label}</label>
            <input
              type="url"
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              className={inputClass}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
      </div>
    </div>
  );
}

// ─── Google Maps Tab ─────────────────────────────────────────────────────────

function MapsTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    maps_provider: "leaflet",
    maps_google_api_key: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=maps")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "maps" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) showToast("Impostazioni mappa salvate", "success");
      else showToast(data.error || "Errore", "error");
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-warm-900">Mappa Rete di Vendita</h2>
        <p className="text-sm text-warm-500 mt-1">
          Scegli quale provider usare sulla pagina Rete di Vendita per visualizzare i punti vendita e gli agenti.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-3">Provider mappa</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-warm-200 rounded-lg cursor-pointer hover:bg-warm-50">
              <input
                type="radio"
                name="maps_provider"
                value="leaflet"
                checked={form.maps_provider === "leaflet"}
                onChange={() => setForm({ ...form, maps_provider: "leaflet" })}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-warm-900">Leaflet + OpenStreetMap (consigliato)</div>
                <div className="text-xs text-warm-500 mt-0.5">
                  Gratuito, nessuna chiave API o carta di credito richiesta. Funziona subito, supporta cluster di marker e ricerca città.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border border-warm-200 rounded-lg cursor-pointer hover:bg-warm-50">
              <input
                type="radio"
                name="maps_provider"
                value="google"
                checked={form.maps_provider === "google"}
                onChange={() => setForm({ ...form, maps_provider: "google" })}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-warm-900">Google Maps</div>
                <div className="text-xs text-warm-500 mt-0.5">
                  Richiede una API key Google Cloud (con fatturazione abilitata). Senza chiave valida la mappa mostrerà il watermark &quot;for development purposes only&quot;.
                </div>
              </div>
            </label>
          </div>
        </div>

        {form.maps_provider === "google" && (
          <div>
            <label className="block text-sm font-medium text-warm-800 mb-1.5">API Key Google Maps</label>
            <input
              type="text"
              value={form.maps_google_api_key}
              onChange={(e) => setForm({ ...form, maps_google_api_key: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm font-mono focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
            <p className="text-xs text-warm-500 mt-2">
              Crea la chiave su <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a>. Abilita: Maps JavaScript API, Places API, Geocoding API. Restringi la chiave al dominio del sito.
            </p>
            {!form.maps_google_api_key.trim() && (
              <div className="mt-3 text-xs px-3 py-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                ⚠ Senza una API Key valida il sito userà comunque Leaflet come fallback (per non lasciare la mappa rotta). Inserisci la chiave per attivare Google Maps sul frontend.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
      </div>
    </div>
  );
}

// ─── Storage Tab ─────────────────────────────────────────────────────────────

function StorageTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    wasabi_access_key: "",
    wasabi_secret_key: "",
    wasabi_bucket: "",
    wasabi_region: "",
    wasabi_endpoint: "",
    bunny_api_key: "",
    bunny_storage_zone: "",
    bunny_hostname: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=storage")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "storage" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Impostazioni storage salvate", "success");
      } else {
        showToast(data.error || "Errore nel salvataggio", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWasabi = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-storage", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.data.message, "success");
      } else {
        showToast(data.error || "Test fallito", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTesting(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Configurazione Storage Cloud</h2>
        <p className="text-sm text-warm-500 mt-1">Configura i servizi di storage cloud per i file media.</p>
      </div>

      {/* Wasabi */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Wasabi S3</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Access Key</label>
            <input type="text" value={form.wasabi_access_key} onChange={(e) => update("wasabi_access_key", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Secret Key</label>
            <input type="password" value={form.wasabi_secret_key} onChange={(e) => update("wasabi_secret_key", e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Bucket</label>
            <input type="text" value={form.wasabi_bucket} onChange={(e) => update("wasabi_bucket", e.target.value)} className={inputClass} placeholder="gtv-media" />
          </div>
          <div>
            <label className={labelClass}>Region</label>
            <input type="text" value={form.wasabi_region} onChange={(e) => update("wasabi_region", e.target.value)} className={inputClass} placeholder="eu-central-1" />
          </div>
          <div>
            <label className={labelClass}>Endpoint</label>
            <input type="text" value={form.wasabi_endpoint} onChange={(e) => update("wasabi_endpoint", e.target.value)} className={inputClass} placeholder="https://s3.eu-central-1.wasabisys.com" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-700">
            Inserisci le credenziali qui e salva. La configurazione viene letta direttamente dal database, non serve modificare file di sistema.
          </p>
        </div>
      </div>

      {/* Bunny */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">BunnyCDN</h3>
          <span className="text-[10px] font-medium text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full uppercase">Coming soon</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>API Key</label>
            <input type="password" value={form.bunny_api_key} onChange={(e) => update("bunny_api_key", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Storage Zone</label>
            <input type="text" value={form.bunny_storage_zone} onChange={(e) => update("bunny_storage_zone", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hostname</label>
            <input type="text" value={form.bunny_hostname} onChange={(e) => update("bunny_hostname", e.target.value)} className={inputClass} placeholder="cdn.example.com" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
        <button onClick={handleTestWasabi} disabled={testing} className={btnSecondary}>
          {testing && <Loader2 size={16} className="animate-spin" />}
          Testa connessione Wasabi
        </button>
      </div>
    </div>
  );
}

// ─── Translations AI Tab ─────────────────────────────────────────────────────

interface LanguageOption { code: string; name: string; isDefault: boolean }

const DEFAULT_TRANSLATION_PROMPT_UI = `You are a professional translator for a furniture/design company website (Gebrüder Thonet Vienna).
Translate from {fromLang} to {toLang}.
Preserve brand names, designer names, product model names and proper nouns unchanged.
Keep the same tone (elegant, refined, design-oriented).
Output ONLY the translated text — no explanations, no quotes, no extra formatting.{htmlNote}`;

function TranslationsAITab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [form, setForm] = useState({
    ai_provider: "anthropic",
    ai_anthropic_api_key: "",
    ai_anthropic_model: "claude-sonnet-4-6",
    ai_openai_api_key: "",
    ai_openai_model: "gpt-4o-mini",
    ai_fallback_language: "it",
    ai_system_prompt: DEFAULT_TRANSLATION_PROMPT_UI,
  });
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings?group=translations")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const next = { ...form };
          for (const s of data.data) {
            if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
          }
          setForm(next);
        }
      });
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setLanguages(data.data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value, group: "translations" }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) showToast("Impostazioni traduzioni salvate", "success");
      else showToast(data.error || "Errore nel salvataggio", "error");
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Ciao, questo è un test.", fromLang: "it", toLang: "en" }),
      });
      const data = await res.json();
      if (data.success) showToast(`Test ok: "${data.translation}"`, "success");
      else showToast(data.error || "Errore di test", "error");
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTesting(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Traduzioni automatiche con AI</h2>
        <p className="text-sm text-warm-500 mt-1">Configura il provider AI usato dal bottone &ldquo;Traduci con AI&rdquo; in admin.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className={labelClass}>Provider AI</label>
          <select value={form.ai_provider} onChange={(e) => update("ai_provider", e.target.value)} className={inputClass}>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI ChatGPT</option>
          </select>
          <p className="text-xs text-warm-400 mt-1">Solo il provider selezionato verrà usato per tradurre.</p>
        </div>

        <div>
          <label className={labelClass}>Lingua di fallback</label>
          <select value={form.ai_fallback_language} onChange={(e) => update("ai_fallback_language", e.target.value)} className={inputClass}>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.name} ({l.code}){l.isDefault ? " — default" : ""}</option>
            ))}
          </select>
          <p className="text-xs text-warm-400 mt-1">Mostrata sul sito pubblico se manca la traduzione nella lingua richiesta.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800">Anthropic Claude</h3>
        <div>
          <label className={labelClass}>API Key Claude</label>
          <input type="password" value={form.ai_anthropic_api_key} onChange={(e) => update("ai_anthropic_api_key", e.target.value)} className={inputClass} placeholder="sk-ant-..." autoComplete="off" />
        </div>
        <div>
          <label className={labelClass}>Modello Claude</label>
          <input type="text" value={form.ai_anthropic_model} onChange={(e) => update("ai_anthropic_model", e.target.value)} className={inputClass} placeholder="claude-sonnet-4-6" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800">OpenAI ChatGPT</h3>
        <div>
          <label className={labelClass}>API Key OpenAI</label>
          <input type="password" value={form.ai_openai_api_key} onChange={(e) => update("ai_openai_api_key", e.target.value)} className={inputClass} placeholder="sk-..." autoComplete="off" />
        </div>
        <div>
          <label className={labelClass}>Modello OpenAI</label>
          <input type="text" value={form.ai_openai_model} onChange={(e) => update("ai_openai_model", e.target.value)} className={inputClass} placeholder="gpt-4o-mini" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-warm-800">Prompt di sistema</h3>
            <p className="text-xs text-warm-500 mt-1">
              Istruzioni che l&apos;AI riceve prima di tradurre. Usa i placeholder
              <code className="mx-1 px-1 bg-warm-100 rounded text-[11px]">{"{fromLang}"}</code>,
              <code className="mx-1 px-1 bg-warm-100 rounded text-[11px]">{"{toLang}"}</code>,
              <code className="mx-1 px-1 bg-warm-100 rounded text-[11px]">{"{htmlNote}"}</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Ripristinare il prompt di default? Le modifiche correnti verranno perse.")) {
                update("ai_system_prompt", DEFAULT_TRANSLATION_PROMPT_UI);
                showToast("Prompt ripristinato — ricordati di salvare", "success");
              }
            }}
            className="text-xs text-warm-500 hover:text-warm-800 underline shrink-0"
          >
            Ripristina default
          </button>
        </div>
        <textarea
          value={form.ai_system_prompt}
          onChange={(e) => update("ai_system_prompt", e.target.value)}
          className={`${inputClass} font-mono text-xs leading-relaxed min-h-[220px]`}
          rows={10}
          spellCheck={false}
        />
        {form.ai_system_prompt !== DEFAULT_TRANSLATION_PROMPT_UI && (
          <p className="text-xs text-amber-700">Prompt personalizzato attivo (diverso dal default).</p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
        <button onClick={handleTest} disabled={testing} className={btnSecondary}>
          {testing && <Loader2 size={16} className="animate-spin" />}
          Testa traduzione (IT → EN)
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("smtp");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "smtp":
        return <SmtpTab showToast={showToast} />;
      case "recaptcha":
        return <RecaptchaTab showToast={showToast} />;
      case "languages":
        return <LanguagesTab />;
      case "translations":
        return <TranslationsAITab showToast={showToast} />;
      case "stats":
        return <StatsTab />;
      case "backup":
        return <BackupTab showToast={showToast} />;
      case "storage":
        return <StorageTab showToast={showToast} />;
      case "social":
        return <SocialTab showToast={showToast} />;
      case "maps":
        return <MapsTab showToast={showToast} />;
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Impostazioni</h1>
        <p className="text-sm text-warm-500 mt-1">Configura le impostazioni generali del sito.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Vertical tabs (desktop) / Horizontal pills (mobile) */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-warm-800 text-white"
                      : "text-warm-600 hover:bg-warm-100 hover:text-warm-800"
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
