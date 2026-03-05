"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  ArrowRight,
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
}

interface BackupPreview {
  [key: string]: number;
}

type TabKey = "smtp" | "recaptcha" | "languages" | "stats" | "backup" | "storage";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: "smtp", label: "Email / SMTP", icon: Mail },
  { key: "recaptcha", label: "reCAPTCHA", icon: Shield },
  { key: "languages", label: "Lingue", icon: Globe },
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

function LanguagesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-warm-800">Gestione Lingue</h2>
        <p className="text-sm text-warm-500 mt-1">Configura le lingue disponibili sul sito.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-8 text-center">
        <Globe size={48} className="mx-auto text-warm-300 mb-4" />
        <h3 className="text-warm-800 font-semibold mb-2">Lingue del sito</h3>
        <p className="text-sm text-warm-500 mb-6 max-w-md mx-auto">
          Gestisci le lingue disponibili, imposta la lingua predefinita e configura le traduzioni del sito dalla pagina dedicata.
        </p>
        <Link
          href="/admin/languages"
          className="inline-flex items-center gap-2 bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          Gestisci Lingue <ArrowRight size={16} />
        </Link>
      </div>
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
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-4">File Media</h3>
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
            <div className="text-xs text-warm-500 mt-1">Sincronizzati</div>
          </div>
          <div className="bg-warm-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-warm-800">{stats.media.unsynced}</div>
            <div className="text-xs text-warm-500 mt-1">Non sincronizzati</div>
          </div>
        </div>
      </div>
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
      case "stats":
        return <StatsTab />;
      case "backup":
        return <BackupTab showToast={showToast} />;
      case "storage":
        return <StorageTab showToast={showToast} />;
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
