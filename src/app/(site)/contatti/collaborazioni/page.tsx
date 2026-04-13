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
  placeholder?: string;
}

const DEFAULT_COLLABORATION_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "Nome", type: "text", required: true, enabled: true, order: 0 },
  { key: "lastName", label: "Cognome", type: "text", required: true, enabled: true, order: 1 },
  { key: "email", label: "Indirizzo email", type: "email", required: true, enabled: true, order: 2 },
  { key: "company", label: "Nome dello studio", type: "text", required: false, enabled: true, order: 3 },
  { key: "vatNumber", label: "Partita IVA", type: "text", required: true, enabled: true, order: 4 },
  { key: "notes", label: "Altre informazioni", type: "textarea", required: false, enabled: true, order: 5, placeholder: "Hai qualcosa da aggiungere? Inserisci qui le tue note" },
  { key: "acceptPrivacy", label: "Conferma di aver preso visione dell'informativa della Privacy e sull'utilizzo dei dati personali", type: "checkbox", required: true, enabled: true, order: 6 },
  { key: "acceptProfiling", label: "Presto il consenso per le attività di profilazione", type: "checkbox", required: true, enabled: true, order: 7 },
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

    const privacyField = activeConfig.find((f) => f.key === "acceptPrivacy");
    if (privacyField?.required && !form.acceptPrivacy) {
      setError("Devi accettare la privacy policy per inviare il messaggio.");
      return;
    }
    const profilingField = activeConfig.find((f) => f.key === "acceptProfiling");
    if (profilingField?.required && !form.acceptProfiling) {
      setError("Devi accettare la profilazione per inviare il messaggio.");
      return;
    }

    setSubmitting(true);

    try {
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("contact_collaboration");
      }

      const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || (form.name as string) || "";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: form.email || "",
          company: form.company || undefined,
          phone: form.phone || undefined,
          contactReason: form.contactReason || undefined,
          subject: form.subject || undefined,
          message: [
            form.vatNumber ? `Partita IVA: ${form.vatNumber}` : "",
            form.notes ? `Altre informazioni: ${form.notes}` : "",
            form.message || "",
            form.acceptProfiling ? "Consenso profilazione: SI" : "",
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
      // Render label with embedded link if it mentions Privacy/profilazione
      const labelHtml = (() => {
        const text = field.label;
        const lc = text.toLowerCase();
        if (lc.includes("privacy")) {
          // Wrap "informativa della Privacy" or "privacy policy" with link
          const match = text.match(/(privacy policy|informativa della privacy)/i);
          if (match) {
            const idx = text.toLowerCase().indexOf(match[0].toLowerCase());
            return (
              <>
                {text.slice(0, idx)}
                <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-warm-600">{text.slice(idx, idx + match[0].length)}</Link>
                {text.slice(idx + match[0].length)}
              </>
            );
          }
        }
        if (lc.includes("profilazione")) {
          const match = text.match(/(le attività di profilazione|attività di profilazione)/i);
          if (match) {
            const idx = text.toLowerCase().indexOf(match[0].toLowerCase());
            return (
              <>
                {text.slice(0, idx)}
                <Link href="/privacy-policy#profilazione" className="underline underline-offset-2 hover:text-warm-600">{text.slice(idx, idx + match[0].length)}</Link>
                {text.slice(idx + match[0].length)}
              </>
            );
          }
        }
        return text;
      })();

      return (
        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
            className="mt-1 accent-black"
            required={field.required}
          />
          <span className="text-[16px] text-black font-light leading-snug">
            {labelHtml}{field.required && "*"}
          </span>
        </label>
      );
    }

    const inputBase = "w-full border border-black bg-white text-[16px] text-black font-light px-3 py-3 focus:outline-none focus:border-black placeholder:text-warm-400";

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="block text-[14px] text-black font-light mb-2">
            {field.label}{field.required && "*"}
          </label>
          <select
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className={inputBase}
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
          <label className="block text-[14px] text-black font-light mb-2">
            {field.label}{field.required && "*"}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            rows={4}
            placeholder={field.placeholder}
            className={`${inputBase} resize-y`}
            required={field.required}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className="block text-[13px] text-black font-light mb-2">
          {field.label}{field.required && "*"}
        </label>
        <input
          type={field.type}
          value={value as string}
          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
          placeholder={field.placeholder}
          className={inputBase}
          required={field.required}
        />
      </div>
    );
  };

  const renderFields = () => {
    const normalFields = activeConfig.filter((f) => f.type !== "checkbox");
    const checkboxFields = activeConfig.filter((f) => f.type === "checkbox");

    const rows: React.ReactNode[] = normalFields.map((f) => (
      <div key={f.key}>{renderField(f)}</div>
    ));

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
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                    {error}
                  </div>
                )}

                {renderFields()}

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="uppercase text-[14px] tracking-[0.1em] text-black font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ textUnderlineOffset: "6px", textDecorationThickness: "0.5px" }}
                  >
                    {submitting ? "Invio in corso..." : "Invia i tuoi dati"}
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
