"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import PageHero from "@/components/PageHero";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const DEFAULT_FIELD_CONFIG: FieldConfig[] = [
  { key: "name", label: "Nome e Cognome", type: "text", required: true, enabled: true, order: 1 },
  { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 2 },
  { key: "company", label: "Azienda", type: "text", required: false, enabled: true, order: 3 },
  { key: "phone", label: "Telefono", type: "tel", required: false, enabled: true, order: 4 },
  { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: true, order: 5 },
  { key: "subject", label: "Oggetto", type: "text", required: false, enabled: true, order: 6 },
  { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 7 },
  { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 8 },
  { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 9 },
];

const DEFAULT_HERO = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop";

export default function RichiestaInfoPage() {
  const [fieldConfig, setFieldConfig] = useState<FieldConfig[] | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contactReasons, setContactReasons] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    fetch("/api/form-configs/public?type=info_request")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) setFieldConfig(data.data);
      })
      .catch(() => {});
    fetch("/api/contact-reasons/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setContactReasons(data.data);
      })
      .catch(() => {});
    fetch("/api/page-images?page=richiesta-info")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const hero = data.data?.find((i: { section: string }) => i.section === "hero");
          if (hero?.imageUrl) setHeroImage(hero.imageUrl);
        }
      })
      .catch(() => {});
  }, []);

  const activeConfig = (fieldConfig || DEFAULT_FIELD_CONFIG)
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!activeConfig || activeConfig.length === 0) return;
    const initial: Record<string, string | boolean> = {};
    activeConfig.forEach((f) => {
      initial[f.key] = f.type === "checkbox" ? true : "";
    });
    setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.acceptPrivacy) {
      setError("Devi accettare la privacy policy per inviare il messaggio.");
      return;
    }

    setSubmitting(true);

    try {
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("contact_info");
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || "",
          email: form.email || "",
          company: form.company || undefined,
          phone: form.phone || undefined,
          contactReason: form.contactReason || undefined,
          subject: form.subject || undefined,
          message: form.message || "",
          type: "info",
          recaptchaToken,
          subscribeNewsletter: !!form.subscribeNewsletter,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante l'invio del messaggio.");
        return;
      }

      setSent(true);
    } catch {
      setError("Errore di connessione. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = form[field.key] ?? (field.type === "checkbox" ? false : "");

    if (field.type === "checkbox") {
      if (field.key === "acceptPrivacy") {
        return (
          <label key={field.key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
              className="mt-0.5 accent-warm-800"
              required={field.required}
            />
            <span className="text-sm text-warm-600">
              Accetto la{" "}
              <Link href="/privacy-policy" className="text-warm-800 underline hover:text-warm-900">
                privacy policy
              </Link>{" "}
              *
            </span>
          </label>
        );
      }
      return (
        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
            className="mt-0.5 accent-warm-800"
          />
          <span className="text-sm text-warm-600">{field.label}</span>
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            {field.label} {field.required && "*"}
          </label>
          <select
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none bg-white"
            required={field.required}
          >
            <option value="">Seleziona...</option>
            {contactReasons.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key}>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            {field.label} {field.required && "*"}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            rows={6}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
            required={field.required}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          {field.label} {field.required && "*"}
        </label>
        <input
          type={field.type}
          value={value as string}
          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
          required={field.required}
        />
      </div>
    );
  };

  const renderFields = () => {
    const normalFields = activeConfig.filter(
      (f) => f.type !== "checkbox" && f.type !== "textarea"
    );
    const textareaFields = activeConfig.filter((f) => f.type === "textarea");
    const checkboxFields = activeConfig.filter((f) => f.type === "checkbox");

    const rows: React.ReactNode[] = [];

    // Render normal fields in 2-column grid rows (consecutive pairs)
    for (let i = 0; i < normalFields.length; i += 2) {
      if (i + 1 < normalFields.length) {
        rows.push(
          <div key={`row-${normalFields[i].key}-${normalFields[i + 1].key}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField(normalFields[i])}
            {renderField(normalFields[i + 1])}
          </div>
        );
      } else {
        rows.push(
          <div key={`row-${normalFields[i].key}`}>
            {renderField(normalFields[i])}
          </div>
        );
      }
    }

    // Render textarea fields full width
    textareaFields.forEach((f) => {
      rows.push(renderField(f));
    });

    // Render checkbox fields grouped at the bottom
    if (checkboxFields.length > 0) {
      rows.push(
        <div key="checkbox-group" className="space-y-3">
          {checkboxFields.map((f) => renderField(f))}
        </div>
      );
    }

    return rows;
  };

  return (
    <>
      <PageHero
        page="richiesta-info"
        defaultTitle="Richiesta informazioni"
        defaultImage={heroImage}
      />

      <section className="section-padding">
        <div className="luxury-container max-w-2xl">
          <p className="text-sm text-warm-600 leading-relaxed mb-12 text-center">
            Compila il modulo sottostante per ricevere informazioni sui nostri prodotti,
            servizi o qualsiasi altra richiesta.
          </p>

          {sent ? (
            <div className="text-center py-12">
              <h2 className="font-serif text-2xl text-warm-800 mb-4">Messaggio inviato!</h2>
              <p className="text-sm text-warm-600">Ti risponderemo il prima possibile.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                  {error}
                </div>
              )}

              {renderFields()}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-warm-800 text-white py-3 rounded text-sm font-medium uppercase tracking-wider hover:bg-warm-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Invio in corso..." : "Invia messaggio"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
