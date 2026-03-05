"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import type { HeroSlide } from "@/types";

const HERO_AUTOPLAY = 5000;

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

/* ── HERO ──────────────────────────────────────────────── */
function CollaborazioniHero() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/hero-slides?page=collaborazioni")
      .then((r) => r.json())
      .then((data) => {
        setSlides(data.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  if (loaded && slides.length === 0) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ height: "calc(100vh - 6rem)" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-[46px] md:text-[58px] lg:text-[70px] text-white tracking-wide"
        >
          Collaborazioni
        </motion.h1>
      </section>
    );
  }

  if (!loaded) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-100" style={{ height: "calc(100vh - 6rem)" }}>
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </section>
    );
  }

  const slide = slides[current];

  const textAlignH =
    slide.position === "left" ? "items-start text-left pl-8 md:pl-20" :
    slide.position === "right" ? "items-end text-right pr-8 md:pr-20" :
    "items-center text-center";

  const textAlignV =
    slide.verticalPosition === "top" ? "top-20 bottom-auto" :
    slide.verticalPosition === "bottom" ? "bottom-20 top-auto" :
    "top-1/2 -translate-y-1/2";

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 6rem)" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image src={slide.imageUrl} alt={slide.title} fill className="object-cover" priority sizes="100vw" />
        </motion.div>
      </AnimatePresence>

      {slide.darkOverlay ? (
        <div className="absolute inset-0 bg-black" style={{ opacity: (slide.overlayOpacity ?? 60) / 100 }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${slide.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH}`}
        >
          <h1 className="font-serif text-[40px] md:text-[50px] lg:text-[60px] text-white tracking-wide">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-sm md:text-base text-white/70 mt-2 max-w-2xl">{slide.subtitle}</p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <Link href={slide.ctaLink} className="inline-block mt-4 uppercase text-sm tracking-[0.2em] text-white font-medium hover:text-white/80 transition-colors">
              {slide.ctaText} <span className="ml-1">&rarr;</span>
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10" aria-label="Slide precedente">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrent((prev) => (prev + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10" aria-label="Slide successivo">
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all duration-300 ${idx === current ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"}`}
              aria-label={`Vai allo slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
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
            <input type="checkbox" checked={!!value} onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} className="mt-0.5 accent-warm-800" required={field.required} />
            <span className="text-sm text-warm-600">
              Accetto la{" "}
              <Link href="/privacy-policy" className="text-warm-800 underline hover:text-warm-900">privacy policy</Link>{" "}*
            </span>
          </label>
        );
      }
      return (
        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} className="mt-0.5 accent-warm-800" />
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
    const normalFields = activeConfig.filter((f) => f.type !== "checkbox" && f.type !== "textarea");
    const textareaFields = activeConfig.filter((f) => f.type === "textarea");
    const checkboxFields = activeConfig.filter((f) => f.type === "checkbox");

    const rows: React.ReactNode[] = [];

    for (let i = 0; i < normalFields.length; i += 2) {
      if (i + 1 < normalFields.length) {
        rows.push(
          <div key={`row-${normalFields[i].key}-${normalFields[i + 1].key}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div key="checkbox-group" className="space-y-3">
          {checkboxFields.map((f) => renderField(f))}
        </div>
      );
    }

    return rows;
  };

  return (
    <>
      <CollaborazioniHero />

      {/* ── TEXT (stile Made in Italy) ──────────────────────── */}
      <section className="section-padding">
        <div className="gtv-container-narrow">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-lg text-dark leading-[1.8] font-light">
              GTV è sempre alla ricerca di nuove visioni e talenti nel design.
              Se desideri collaborare con noi e proporre le tue idee, inviaci la
              tua candidatura attraverso il form sottostante. Siamo pronti a
              esplorare insieme nuove possibilità.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FORM ───────────────────────────────────────────── */}
      <section className="pb-20 md:pb-28 lg:pb-36">
        <div className="gtv-container-narrow">
          {sent ? (
            <div className="text-center py-12">
              <h2 className="font-serif text-2xl text-warm-800 mb-4">Grazie!</h2>
              <p className="text-sm text-warm-600">La tua candidatura è stata inviata con successo.</p>
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
                {submitting ? "Invio in corso..." : "Invia candidatura"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container pb-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/contatti" className="hover:text-warm-700 transition-colors">Contatti</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Collaborazioni Nuovi Designer</span>
        </nav>
      </div>
    </>
  );
}
