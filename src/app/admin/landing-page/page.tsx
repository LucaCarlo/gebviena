"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  Settings2,
  Mail,
  ScanLine,
  Camera,
  AlertCircle,
} from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

/* ───── Types ───── */

interface FormState {
  heroTitle: string;
  heroSubtitle: string;
  heroLocation: string;
  heroDescription: string;
  successTitle: string;
  successMessage: string;
  privacyLabel: string;
  marketingLabel: string;
  buttonLabel: string;
  bannerImage: string;
  logoImage: string;
  emailSubject: string;
  emailTitle: string;
  emailBody: string;
  emailFooter: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormState = {
  heroTitle: "Milan Design Week 2026",
  heroSubtitle: "Come and experience the True Over Time Collection with us.",
  heroLocation: "Milan Flagship Store\nPalazzo Gallarati Scotti\nVia Manzoni 30",
  heroDescription: "Register to receive your QR code to show at entrance.\nThe QR code is personal and can't be shared.",
  successTitle: "Thank you. Your QR code has been generated.",
  successMessage: "",
  privacyLabel: "I have read and understood the Privacy Policy on processing of my personal data and I confirm that I am over 18.",
  marketingLabel: "I agree to receive communications and updates about GTV products and events.",
  buttonLabel: "Register",
  bannerImage: "",
  logoImage: "",
  emailSubject: "Your Event Registration - QR Code",
  emailTitle: "Registration Confirmed",
  emailBody: "Thank you for registering. Please find below your personal QR code to show at the entrance.\nThe QR code is personal and can't be shared.",
  emailFooter: "Gebrüder Thonet Vienna GmbH\nVia Foggia 23/H – 10152 Torino (Italy)",
  isActive: true,
};

type Tab = "config" | "email" | "scanner";

const TABS: { key: Tab; label: string; icon: typeof Settings2 }[] = [
  { key: "config", label: "Configurazione", icon: Settings2 },
  { key: "email", label: "Email", icon: Mail },
  { key: "scanner", label: "Scannerizza", icon: ScanLine },
];

/* ───── Email Preview ───── */

function EmailPreview({ emailTitle, emailBody, emailFooter }: { emailTitle: string; emailBody: string; emailFooter: string }) {
  const bodyLines = emailBody.replace(/\{\{firstName\}\}/g, "Mario").replace(/\{\{lastName\}\}/g, "Rossi").split("\n");
  const footerLines = emailFooter.split("\n");

  return (
    <div className="border border-warm-200 rounded-lg bg-white overflow-hidden">
      <div className="bg-warm-50 px-4 py-2 border-b border-warm-200">
        <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Anteprima Email</span>
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", maxWidth: "100%" }}>
        {/* Banner placeholder */}
        <div style={{ background: "#3a5a6a", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "2px" }}>BANNER</span>
        </div>
        {/* Teal content */}
        <div style={{ background: "#3a5a6a", padding: "20px 24px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "16px", fontWeight: "normal", color: "#fff", marginBottom: "12px" }}>
            {emailTitle || "Registration Confirmed"}
          </h1>
          {bodyLines.map((line, i) => (
            <p key={i} style={{ fontSize: "12px", color: "#fff", margin: "0 0 4px 0", fontStyle: "italic" }}>{line}</p>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.3)", margin: "14px 0 0 0" }} />
        </div>
        {/* QR section */}
        <div style={{ padding: "16px", textAlign: "center", background: "#fff" }}>
          <div style={{ display: "inline-block", width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "4px" }} />
          <p style={{ fontSize: "9px", color: "#666", marginTop: "8px", fontFamily: "monospace" }}>TEST-QR-a1b2c3d4</p>
        </div>
        {/* Footer */}
        <div style={{ background: "#f5f4f2", padding: "10px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#999" }}>
            {footerLines.map((line, i) => (
              <span key={i}>{line}{i < footerLines.length - 1 && <br />}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── QR Scanner Tab ───── */

interface ScanResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  error?: string;
  data?: {
    firstName: string;
    lastName: string;
    email: string;
    profile: string | null;
    checkedInAt: string | null;
  };
}

function ScannerTab() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ name: string; time: string; isNew: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processQrCode = async (code: string) => {
    if (processing) return;
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch("/api/event-registrations/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: code.trim() }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
      if (data.success && data.data) {
        setScanHistory((prev) => [
          { name: `${data.data!.firstName} ${data.data!.lastName}`, time: new Date().toLocaleTimeString("it-IT"), isNew: !data.alreadyCheckedIn },
          ...prev.slice(0, 19),
        ]);
      }
    } catch {
      setResult({ success: false, error: "Errore di connessione" });
    }
    setProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processQrCode(manualCode.trim());
      setManualCode("");
    }
  };

  // Scan QR from uploaded image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode("qr-file-reader");
      const decoded = await qr.scanFile(file, true);
      processQrCode(decoded);
      qr.clear();
    } catch {
      setResult({ success: false, error: "QR code non trovato nell'immagine. Riprova con una foto più nitida." });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Dynamic import of html5-qrcode for camera
  useEffect(() => {
    if (!scanning) return;

    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const qr = new Html5Qrcode("qr-reader");
      scanner = qr as unknown as { stop: () => Promise<void>; clear: () => void };

      // Use advanced constraints for better focus on screens
      qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText) => {
          processQrCode(decodedText);
        },
        () => {}
      ).then(() => {
        // Try to enable continuous autofocus after camera starts
        try {
          const videoElem = document.querySelector("#qr-reader video") as HTMLVideoElement;
          if (videoElem?.srcObject) {
            const track = (videoElem.srcObject as MediaStream).getVideoTracks()[0];
            const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
            if (capabilities?.focusMode) {
              track.applyConstraints({
                advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
              }).catch(() => {});
            }
          }
        } catch { /* ignore */ }
      }).catch((err: Error) => {
        console.error("Camera error:", err);
        setScanning(false);
      });
    });

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-warm-900 mb-1">Scansiona QR Code</h2>
        <p className="text-xs text-warm-500 mb-6">
          Usa la fotocamera per scansionare il QR code stampato dall&apos;utente, oppure inserisci il codice manualmente.
        </p>

        {/* Camera scanner */}
        <div className="mb-6">
          {scanning ? (
            <div>
              <div id="qr-reader" className="rounded-lg overflow-hidden mb-3" style={{ maxWidth: "400px", margin: "0 auto" }} />
              <div className="text-center">
                <button onClick={() => setScanning(false)} className="text-sm text-warm-600 hover:text-warm-800 transition-colors">
                  Chiudi fotocamera
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setResult(null); setScanning(true); }}
                className="flex items-center justify-center gap-3 bg-warm-800 text-white py-4 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
              >
                <Camera size={20} />
                Scansiona con fotocamera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-warm-100 text-warm-700 py-4 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
              >
                <ScanLine size={20} />
                Carica foto / screenshot QR
              </button>
            </div>
          )}
          {/* Hidden file input for QR image upload */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
          {/* Hidden div for file-based QR scanning */}
          <div id="qr-file-reader" className="hidden" />
        </div>

        {/* Manual input */}
        <div className="border-t border-warm-200 pt-4">
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Oppure inserisci il codice manualmente
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="UUID del QR code..."
              className="flex-1 border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={processing || !manualCode.trim()}
              className="flex items-center gap-2 bg-warm-100 text-warm-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-200 disabled:opacity-50 transition-colors shrink-0"
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
              Check-in
            </button>
          </form>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
          !result.success
            ? "bg-red-50 border-red-200"
            : result.alreadyCheckedIn
            ? "bg-yellow-50 border-yellow-200"
            : "bg-green-50 border-green-200"
        }`}>
          {!result.success ? (
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">QR Code non valido</p>
                <p className="text-sm text-red-600 mt-0.5">{result.error}</p>
              </div>
            </div>
          ) : result.alreadyCheckedIn ? (
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-yellow-600 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Già registrato</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  {result.data?.firstName} {result.data?.lastName} ha già effettuato il check-in
                  {result.data?.checkedInAt && ` il ${new Date(result.data.checkedInAt).toLocaleString("it-IT")}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Check-in completato!</p>
                <p className="text-sm text-green-700 mt-0.5">
                  {result.data?.firstName} {result.data?.lastName}
                  {result.data?.profile && ` — ${result.data.profile}`}
                </p>
                <p className="text-xs text-green-600 mt-0.5">{result.data?.email}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200">
          <div className="p-4 border-b border-warm-200">
            <h3 className="text-sm font-semibold text-warm-900">Ultimi check-in</h3>
          </div>
          <div className="divide-y divide-warm-100">
            {scanHistory.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.isNew ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-yellow-500" />
                  )}
                  <span className="text-sm text-warm-800">{item.name}</span>
                </div>
                <span className="text-xs text-warm-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Main Component ───── */

export default function AdminLandingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);


  useEffect(() => {
    fetch("/api/landing-page-config?admin=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setForm({
            heroTitle: data.data.heroTitle || "",
            heroSubtitle: data.data.heroSubtitle || "",
            heroLocation: data.data.heroLocation || "",
            heroDescription: data.data.heroDescription || "",
            successTitle: data.data.successTitle || "",
            successMessage: data.data.successMessage || "",
            privacyLabel: data.data.privacyLabel || "",
            marketingLabel: data.data.marketingLabel || "",
            buttonLabel: data.data.buttonLabel || "",
            bannerImage: data.data.bannerImage || "",
            logoImage: data.data.logoImage || "",
            emailSubject: data.data.emailSubject || DEFAULT_FORM.emailSubject,
            emailTitle: data.data.emailTitle || DEFAULT_FORM.emailTitle,
            emailBody: data.data.emailBody || DEFAULT_FORM.emailBody,
            emailFooter: data.data.emailFooter || DEFAULT_FORM.emailFooter,
            isActive: data.data.isActive,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/landing-page-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/landing-page-config/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail, emailSubject: form.emailSubject, emailTitle: form.emailTitle, emailBody: form.emailBody, emailFooter: form.emailFooter, bannerImage: form.bannerImage }),
      });
      const data = await res.json();
      setTestResult(data.success ? { ok: true, msg: "Email inviata!" } : { ok: false, msg: data.error || "Errore invio" });
    } catch {
      setTestResult({ ok: false, msg: "Errore di connessione" });
    }
    setSendingTest(false);
    setTimeout(() => setTestResult(null), 4000);
  };


  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
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
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Landing Page</h1>
          <p className="text-sm text-warm-500 mt-1">Gestisci la landing page evento, email e registrazioni</p>
        </div>
        <a href="/contatti/landing-page" target="_blank" className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 transition-colors">
          <ExternalLink size={16} /> Anteprima
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-warm-800 text-warm-900"
                : "border-transparent text-warm-400 hover:text-warm-600"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Configurazione ═══ */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* Active toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-warm-900">Stato</h2>
                <p className="text-xs text-warm-500 mt-0.5">Abilita o disabilita la landing page</p>
              </div>
              <button type="button" onClick={() => updateField("isActive", !form.isActive)} className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-warm-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Hero */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <h2 className="text-lg font-semibold text-warm-900 mb-4">Sezione Hero</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo principale *</label>
                <input type="text" value={form.heroTitle} onChange={(e) => updateField("heroTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Sottotitolo</label>
                <input type="text" value={form.heroSubtitle} onChange={(e) => updateField("heroSubtitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Location (ogni riga va a capo)</label>
                <textarea value={form.heroLocation} onChange={(e) => updateField("heroLocation", e.target.value)} rows={3} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione (sotto location)</label>
                <textarea value={form.heroDescription} onChange={(e) => updateField("heroDescription", e.target.value)} rows={3} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <h2 className="text-lg font-semibold text-warm-900 mb-4">Banner</h2>
            <ImageUploadField label="Immagine Banner" value={form.bannerImage} onChange={(url) => updateField("bannerImage", url)} onRemove={() => updateField("bannerImage", "")} purpose="landing-banner" folder="landing-page" helpText="Il banner viene mostrato centrato nella pagina, sotto l'header del sito" recommendedSize="900x178px" />
          </div>

          {/* Form labels */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <h2 className="text-lg font-semibold text-warm-900 mb-4">Testi Form</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Label Privacy (checkbox obbligatorio) *</label>
                <textarea value={form.privacyLabel} onChange={(e) => updateField("privacyLabel", e.target.value)} rows={3} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Label Marketing (checkbox opzionale)</label>
                <textarea value={form.marketingLabel} onChange={(e) => updateField("marketingLabel", e.target.value)} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo pulsante</label>
                <input type="text" value={form.buttonLabel} onChange={(e) => updateField("buttonLabel", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Success */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <h2 className="text-lg font-semibold text-warm-900 mb-4">Stato Successo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo conferma *</label>
                <input type="text" value={form.successTitle} onChange={(e) => updateField("successTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Messaggio aggiuntivo</label>
                <textarea value={form.successMessage} onChange={(e) => updateField("successMessage", e.target.value)} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={16} /> Salvato</span>}
            <button type="button" onClick={handleSave} disabled={saving} className="bg-warm-800 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
              {saving ? "Salvataggio..." : "Salva configurazione"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Tab: Email ═══ */}
      {activeTab === "email" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            <h2 className="text-lg font-semibold text-warm-900 mb-1">Email di Conferma</h2>
            <p className="text-xs text-warm-500 mb-6">
              Personalizza l&apos;email inviata dopo la registrazione. Usa <code className="bg-warm-100 px-1 rounded text-[10px]">{"{{firstName}}"}</code> e <code className="bg-warm-100 px-1 rounded text-[10px]">{"{{lastName}}"}</code> per inserire il nome.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto email</label>
                  <input type="text" value={form.emailSubject} onChange={(e) => updateField("emailSubject", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo email</label>
                  <input type="text" value={form.emailTitle} onChange={(e) => updateField("emailTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Corpo email (ogni riga va a capo)</label>
                  <textarea value={form.emailBody} onChange={(e) => updateField("emailBody", e.target.value)} rows={5} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Footer email</label>
                  <textarea value={form.emailFooter} onChange={(e) => updateField("emailFooter", e.target.value)} rows={3} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
                </div>

                <div className="pt-2 border-t border-warm-100">
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Invia email di prova</label>
                  <div className="flex gap-2">
                    <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="email@esempio.com" className="flex-1 border border-warm-300 rounded-lg px-4 py-2 text-sm focus:border-warm-800 focus:outline-none" />
                    <button type="button" onClick={handleSendTest} disabled={sendingTest || !testEmail} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 disabled:opacity-50 transition-colors shrink-0">
                      {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Invia prova
                    </button>
                  </div>
                  {testResult && <p className={`text-xs mt-2 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>{testResult.msg}</p>}
                </div>
              </div>

              <div>
                <EmailPreview emailTitle={form.emailTitle} emailBody={form.emailBody} emailFooter={form.emailFooter} />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={16} /> Salvato</span>}
            <button type="button" onClick={handleSave} disabled={saving} className="bg-warm-800 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
              {saving ? "Salvataggio..." : "Salva configurazione"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Tab: Scanner ═══ */}
      {activeTab === "scanner" && (
        <ScannerTab />
      )}

    </div>
  );
}
