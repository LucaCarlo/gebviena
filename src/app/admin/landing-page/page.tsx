"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink, Send, Loader2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface LandingConfig {
  id: string;
  heroTitle: string;
  heroSubtitle: string | null;
  heroLocation: string | null;
  heroDescription: string | null;
  successTitle: string;
  successMessage: string | null;
  privacyLabel: string;
  marketingLabel: string | null;
  buttonLabel: string;
  bannerImage: string | null;
  logoImage: string | null;
  emailSubject: string | null;
  emailTitle: string | null;
  emailBody: string | null;
  emailFooter: string | null;
  isActive: boolean;
}

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

function EmailPreview({ emailTitle, emailBody, emailFooter }: { emailTitle: string; emailBody: string; emailFooter: string }) {
  const bodyLines = emailBody
    .replace(/\{\{firstName\}\}/g, "Mario")
    .replace(/\{\{lastName\}\}/g, "Rossi")
    .split("\n");
  const footerLines = emailFooter.split("\n");

  return (
    <div className="border border-warm-200 rounded-lg bg-white overflow-hidden">
      <div className="bg-warm-50 px-4 py-2 border-b border-warm-200">
        <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Anteprima Email</span>
      </div>
      <div className="p-6 text-center" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#000", marginBottom: "16px" }}>
          {emailTitle || "Registration Confirmed"}
        </h1>
        <div style={{ marginBottom: "24px" }}>
          {bodyLines.map((line, i) => (
            <p key={i} style={{ fontSize: "14px", color: "#333", margin: "0 0 6px 0" }}>
              {line}
            </p>
          ))}
        </div>
        <div style={{
          display: "inline-block",
          border: "2px solid #e5e5e5",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}>
          <div style={{
            width: "120px",
            height: "120px",
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
        <p style={{ fontSize: "10px", color: "#999", marginTop: "12px" }}>
          QR Code ID: TEST-QR-a1b2c3d4
        </p>
        <hr style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "20px 0" }} />
        <div style={{ fontSize: "11px", color: "#999" }}>
          {footerLines.map((line, i) => (
            <span key={i}>{line}{i < footerLines.length - 1 && <br />}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminLandingPage() {
  const [, setConfig] = useState<LandingConfig | null>(null);
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
          setConfig(data.data);
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
        setConfig(data.data);
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
        body: JSON.stringify({
          testEmail,
          emailSubject: form.emailSubject,
          emailTitle: form.emailTitle,
          emailBody: form.emailBody,
          emailFooter: form.emailFooter,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ ok: true, msg: "Email inviata!" });
      } else {
        setTestResult({ ok: false, msg: data.error || "Errore invio" });
      }
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Landing Page</h1>
          <p className="text-sm text-warm-500 mt-1">
            Configura testi, immagini e email della landing page evento
          </p>
        </div>
        <a
          href="/contatti/landing-page"
          target="_blank"
          className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 transition-colors"
        >
          <ExternalLink size={16} />
          Anteprima
        </a>
      </div>

      <div className="space-y-6">
        {/* Active toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-warm-900">Stato</h2>
              <p className="text-xs text-warm-500 mt-0.5">Abilita o disabilita la landing page</p>
            </div>
            <button
              type="button"
              onClick={() => updateField("isActive", !form.isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isActive ? "bg-green-500" : "bg-warm-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  form.isActive ? "left-6" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Hero section */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Sezione Hero</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Titolo principale *
              </label>
              <input
                type="text"
                value={form.heroTitle}
                onChange={(e) => updateField("heroTitle", e.target.value)}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Sottotitolo
              </label>
              <input
                type="text"
                value={form.heroSubtitle}
                onChange={(e) => updateField("heroSubtitle", e.target.value)}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Location (ogni riga va a capo)
              </label>
              <textarea
                value={form.heroLocation}
                onChange={(e) => updateField("heroLocation", e.target.value)}
                rows={3}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Descrizione (sotto location)
              </label>
              <textarea
                value={form.heroDescription}
                onChange={(e) => updateField("heroDescription", e.target.value)}
                rows={3}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Banner Image */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Banner</h2>
          <ImageUploadField
            label="Immagine Banner"
            value={form.bannerImage}
            onChange={(url) => updateField("bannerImage", url)}
            onRemove={() => updateField("bannerImage", "")}
            purpose="landing-banner"
            folder="landing-page"
            helpText="Il banner viene mostrato centrato nella pagina, sotto l'header del sito"
            recommendedSize="900x178px"
          />
        </div>

        {/* Form labels */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Testi Form</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Label Privacy (checkbox obbligatorio) *
              </label>
              <textarea
                value={form.privacyLabel}
                onChange={(e) => updateField("privacyLabel", e.target.value)}
                rows={3}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Label Marketing (checkbox opzionale)
              </label>
              <textarea
                value={form.marketingLabel}
                onChange={(e) => updateField("marketingLabel", e.target.value)}
                rows={2}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Testo pulsante
              </label>
              <input
                type="text"
                value={form.buttonLabel}
                onChange={(e) => updateField("buttonLabel", e.target.value)}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Success state */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Stato Successo</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Titolo conferma *
              </label>
              <input
                type="text"
                value={form.successTitle}
                onChange={(e) => updateField("successTitle", e.target.value)}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Messaggio aggiuntivo
              </label>
              <textarea
                value={form.successMessage}
                onChange={(e) => updateField("successMessage", e.target.value)}
                rows={2}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Email di conferma */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-1">Email di Conferma</h2>
          <p className="text-xs text-warm-500 mb-6">
            Personalizza l&apos;email che viene inviata dopo la registrazione. Usa <code className="bg-warm-100 px-1 rounded text-[10px]">{"{{firstName}}"}</code> e <code className="bg-warm-100 px-1 rounded text-[10px]">{"{{lastName}}"}</code> per inserire il nome.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Oggetto email
                </label>
                <input
                  type="text"
                  value={form.emailSubject}
                  onChange={(e) => updateField("emailSubject", e.target.value)}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Titolo email
                </label>
                <input
                  type="text"
                  value={form.emailTitle}
                  onChange={(e) => updateField("emailTitle", e.target.value)}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Corpo email (ogni riga va a capo)
                </label>
                <textarea
                  value={form.emailBody}
                  onChange={(e) => updateField("emailBody", e.target.value)}
                  rows={5}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Footer email
                </label>
                <textarea
                  value={form.emailFooter}
                  onChange={(e) => updateField("emailFooter", e.target.value)}
                  rows={3}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
                />
              </div>

              {/* Test email */}
              <div className="pt-2 border-t border-warm-100">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Invia email di prova
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="email@esempio.com"
                    className="flex-1 border border-warm-300 rounded-lg px-4 py-2 text-sm focus:border-warm-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Invia prova
                  </button>
                </div>
                {testResult && (
                  <p className={`text-xs mt-2 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                    {testResult.msg}
                  </p>
                )}
              </div>
            </div>

            {/* Right: preview */}
            <div>
              <EmailPreview
                emailTitle={form.emailTitle}
                emailBody={form.emailBody}
                emailFooter={form.emailFooter}
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <Check size={16} /> Salvato
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-warm-800 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvataggio..." : "Salva configurazione"}
          </button>
        </div>
      </div>
    </div>
  );
}
