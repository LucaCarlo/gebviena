"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import type { HeroSlide } from "@/types";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const DEFAULT_COLLABORATION_FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome e Cognome", type: "text", required: true, enabled: true, order: 0 },
  { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 1 },
  { key: "company", label: "Nome dello studio", type: "text", required: false, enabled: true, order: 2 },
  { key: "phone", label: "Telefono", type: "tel", required: false, enabled: true, order: 3 },
  { key: "vatNumber", label: "Partita IVA", type: "text", required: false, enabled: true, order: 4 },
  { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: false, order: 5 },
  { key: "subject", label: "Oggetto", type: "text", required: false, enabled: false, order: 6 },
  { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 7 },
  { key: "notes", label: "Altre note", type: "textarea", required: false, enabled: true, order: 8 },
  { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 9 },
  { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 10 },
];

/* ── HERO — stesso stile pagina GTV Experience ──────────── */
function CollaborazioniHero() {
  const [slide, setSlide] = useState<HeroSlide | null>(null);

  useEffect(() => {
    fetch("/api/hero-slides?page=collaborazioni")
      .then((r) => r.json())
      .then((data) => {
        const slides = data.data || [];
        if (slides.length > 0) setSlide(slides[0]);
      })
      .catch(() => {});
  }, []);

  const heroImage = slide?.imageUrl || "/images/collaborazioni-hero.webp";

  return (
    <section
      className="relative w-full overflow-hidden bg-warm-900"
      style={{ height: "min(118vh, 1107px)" }}
    >
      <Image
        src={heroImage}
        alt="Collaborazione nuovi designer"
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center text-center px-8">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-white leading-[1.2] tracking-tight">
          Collaborazione nuovi designer
        </h1>
      </div>
    </section>
  );
}

/* ── PAGE ──────────────────────────────────────────────── */
export default function CollaborazioniPage() {
  const [fieldConfig, setFieldConfig] = useState<FieldConfig[] | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contactReasons, setContactReasons] = useState<string[]>([]);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    fetch("/api/form-configs/public?type=collaboration")
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
  }, []);

  const activeConfig = (fieldConfig || DEFAULT_COLLABORATION_FIELDS)
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const initForm = useCallback(() => {
    if (!activeConfig || activeConfig.length === 0) return;
    const initial: Record<string, string | boolean> = {};
    activeConfig.forEach((f) => {
      initial[f.key] = f.type === "checkbox" ? true : "";
    });
    setForm(initial);
  }, [activeConfig]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { initForm(); }, [fieldConfig]);

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
        recaptchaToken = await executeRecaptcha("contact_collaboration");
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
          message: [
            form.vatNumber ? `Partita IVA: ${form.vatNumber}` : "",
            form.notes ? `Altre note: ${form.notes}` : "",
            form.message || "",
          ].filter(Boolean).join("\n\n"),
          type: "collaboration",
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
            <input type="checkbox" checked={!!value} onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} className="mt-1 accent-black" required={field.required} />
            <span className="text-[14px] text-black font-light">
              Accetto la{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-warm-600">privacy policy</Link>{" "}*
            </span>
          </label>
        );
      }
      return (
        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} className="mt-1 accent-black" />
          <span className="text-[14px] text-black font-light">{field.label}</span>
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="block uppercase text-[12px] tracking-[0.05em] text-black font-light mb-2">
            {field.label} {field.required && "*"}
          </label>
          <select
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className="w-full border-0 border-b border-black px-0 py-2 text-[16px] text-black font-light bg-transparent focus:outline-none focus:border-black"
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
          <label className="block uppercase text-[12px] tracking-[0.05em] text-black font-light mb-2">
            {field.label} {field.required && "*"}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            rows={5}
            className="w-full border-0 border-b border-black px-0 py-2 text-[16px] text-black font-light bg-transparent focus:outline-none focus:border-black resize-none"
            required={field.required}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className="block uppercase text-[12px] tracking-[0.05em] text-black font-light mb-2">
          {field.label} {field.required && "*"}
        </label>
        <input
          type={field.type}
          value={value as string}
          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
          className="w-full border-0 border-b border-black px-0 py-2 text-[16px] text-black font-light bg-transparent focus:outline-none focus:border-black"
          required={field.required}
        />
      </div>
    );
  };

  const renderFields = () => {
    const normalFields = activeConfig.filter((f) => f.type !== "checkbox" && f.type !== "textarea");
    const textareaFields = activeConfig.filter((f) => f.type === "textarea");
    const checkboxFields = activeConfig.filter((f) => f.type === "checkbox");

    const rows: React.ReactNode[] = [];

    for (let i = 0; i < normalFields.length; i += 2) {
      if (i + 1 < normalFields.length) {
        rows.push(
          <div key={`row-${normalFields[i].key}-${normalFields[i + 1].key}`} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            {renderField(normalFields[i])}
            {renderField(normalFields[i + 1])}
          </div>
        );
      } else {
        rows.push(<div key={`row-${normalFields[i].key}`}>{renderField(normalFields[i])}</div>);
      }
    }

    textareaFields.forEach((f) => { rows.push(renderField(f)); });

    if (checkboxFields.length > 0) {
      rows.push(
        <div key="checkbox-group" className="space-y-3 pt-4">
          {checkboxFields.map((f) => renderField(f))}
        </div>
      );
    }

    return rows;
  };

  return (
    <>
      <CollaborazioniHero />

      {/* ── Paragrafo intro — stile pagina prodotti ────────── */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <div className="gtv-container">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto"
          >
            GTV è sempre alla ricerca di nuove visioni e talenti nel design.
            Se desideri collaborare con noi e proporre le tue idee, inviaci la
            tua candidatura attraverso il form sottostante. Siamo pronti a
            esplorare insieme nuove possibilità.
          </motion.p>
        </div>
      </section>

      {/* ── FORM ───────────────────────────────────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <div className="max-w-[940px] mx-auto">
            {sent ? (
              <div className="text-center py-12">
                <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-4">Grazie!</h2>
                <p className="text-[16px] text-black font-light">La tua candidatura è stata inviata con successo.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                    {error}
                  </div>
                )}

                {renderFields()}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-block uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                  >
                    {submitting ? "Invio in corso..." : "Invia candidatura"} &rarr;
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/contatti">Contatti</Link>
          <span>&gt;</span>
          <span>Collaborazione nuovi designer</span>
        </div>
      </div>
    </>
  );
}
