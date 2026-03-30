"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink } from "lucide-react";
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
  isActive: boolean;
}

const DEFAULT_CONFIG: Omit<LandingConfig, "id"> = {
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
  isActive: true,
};

export default function AdminLandingPage() {
  const [, setConfig] = useState<LandingConfig | null>(null);
  const [form, setForm] = useState<Omit<LandingConfig, "id">>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Landing Page</h1>
          <p className="text-sm text-warm-500 mt-1">
            Configura i testi e le immagini della landing page evento
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
                value={form.heroSubtitle || ""}
                onChange={(e) => updateField("heroSubtitle", e.target.value)}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Location (ogni riga va a capo)
              </label>
              <textarea
                value={form.heroLocation || ""}
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
                value={form.heroDescription || ""}
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
            value={form.bannerImage || ""}
            onChange={(url) => updateField("bannerImage", url)}
            onRemove={() => updateField("bannerImage", "")}
            purpose="landing-banner"
            folder="landing-page"
            helpText="Il banner viene mostrato centrato nella pagina, sotto l'header del sito"
            recommendedSize="860x140px"
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
                value={form.marketingLabel || ""}
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
                value={form.successMessage || ""}
                onChange={(e) => updateField("successMessage", e.target.value)}
                rows={2}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
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
