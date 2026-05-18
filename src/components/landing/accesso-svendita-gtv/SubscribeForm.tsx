"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/contexts/I18nContext";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";

export interface FieldConfig {
  key: string;
  label: string;
  width: "50" | "70" | "100";
  enabled: boolean;
  order: number;
  placeholder?: string;
}

interface Props {
  buttonLabel?: string;
  privacyLabel?: string;
  fields?: FieldConfig[];
  cardTitle?: string;
  cardSubtitle?: string;
  successTitle?: string;
  successMessage?: string;
}

const REQUIRED_FIELDS = new Set(["firstName", "lastName", "email"]);

const PLACEHOLDER_BY_KEY: Record<string, string> = {
  firstName: "Inserisci il tuo nome",
  lastName: "Inserisci il tuo cognome",
  email: "Inserisci la tua email",
  company: "Inserisci il nome della tua azienda",
  phone: "Inserisci il tuo telefono",
  city: "Città",
  country: "Paese",
  zipCode: "CAP",
  state: "Provincia",
  profile: "Profilo",
};

export default function SubscribeForm({
  buttonLabel = "Ottieni Accesso",
  privacyLabel = "Accetto l'informativa sulla privacy e il trattamento dei miei dati personali.",
  fields,
  cardTitle = "Richiedi Accesso",
  cardSubtitle = "Registrati per accedere alla vendita speciale online.",
  successTitle = "Richiesta inviata",
  successMessage = "Ti abbiamo inviato un'email di conferma all'indirizzo che ci hai fornito. A breve riceverai le istruzioni per accedere alla vendita speciale online.",
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lang = useLang();
  const { executeRecaptcha } = useRecaptcha();
  const inviteToken = searchParams.get("inv") || "";
  const tracked = useRef(false);

  const enabledFields = (fields || []).filter((f) => f.enabled).sort((a, b) => a.order - b.order);

  const [form, setForm] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = { privacyAccepted: false };
    for (const f of enabledFields) init[f.key] = "";
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!inviteToken || tracked.current) return;
    tracked.current = true;
    fetch(`/api/event-invitations/track?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.email) {
          setForm((p) => ({ ...p, email: data.data.email }));
        }
      })
      .catch(() => {});
  }, [inviteToken]);

  const update = (key: string, value: string | boolean) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    for (const f of enabledFields) {
      if (REQUIRED_FIELDS.has(f.key)) {
        const v = form[f.key];
        if (!v || (typeof v === "string" && !v.trim())) e[f.key] = "Campo obbligatorio";
      }
    }
    if (form.email && typeof form.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email non valida";
    }
    if (!form.privacyAccepted) e.privacyAccepted = "Necessario per procedere";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha("landing_svendita_subscribe") : "";
      const res = await fetch("/api/landing/accesso-svendita-gtv/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gtv-lang": lang || "it" },
        body: JSON.stringify({ ...form, inviteToken: inviteToken || undefined, lang: lang || "it", recaptchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        // Naviga a una thank-you page con permalink dedicato: lì viene tracciato
        // l'evento Meta Pixel `CompleteRegistration` (vedi (landing)/[permalink]/grazie).
        // Fallback: se per qualche motivo non posso navigare, mostro il success card inline.
        const cleanPath = (pathname || "/").replace(/\/$/, "");
        const target = `${cleanPath}/grazie`;
        try {
          router.push(target);
        } catch {
          setSuccess(true);
        }
      } else setServerError(data.error || "Si è verificato un errore. Riprova.");
    } catch {
      setServerError("Errore di connessione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-warm-50/50 border border-warm-200 rounded-sm p-8 md:p-10">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-medium text-dark mb-3">{successTitle}</h2>
        <p className="text-sm text-warm-600 leading-relaxed whitespace-pre-line">
          {successMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-warm-50/40 border border-warm-200 rounded-sm p-7 md:p-9">
      <h2 className="text-2xl font-medium text-dark mb-1.5">{cardTitle}</h2>
      <p className="text-sm text-warm-600 mb-6">{cardSubtitle}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {enabledFields.map((f) => {
          const isRequired = REQUIRED_FIELDS.has(f.key);
          const inputType = f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text";
          const placeholder = f.placeholder?.trim() || PLACEHOLDER_BY_KEY[f.key] || f.label;
          return (
            <Field key={f.key} label={f.label} required={isRequired} optional={!isRequired} error={errors[f.key]}>
              <input
                type={inputType}
                value={(form[f.key] as string) || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={placeholder}
                className={inputCls(!!errors[f.key])}
              />
            </Field>
          );
        })}

        <label className="flex items-start gap-3 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.privacyAccepted as boolean}
            onChange={(e) => update("privacyAccepted", e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-dark shrink-0 cursor-pointer"
          />
          <span className={`text-xs leading-relaxed ${errors.privacyAccepted ? "text-red-600" : "text-warm-700"}`}>
            {privacyLabel}{" "}
            <Link href="/privacy-policy" target="_blank" className="underline hover:opacity-60">
              Privacy Policy
            </Link>
          </span>
        </label>

        {serverError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-dark text-white py-3.5 text-sm font-semibold uppercase tracking-[0.18em] hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Invio..." : buttonLabel}
        </button>
      </form>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full bg-white border ${hasError ? "border-red-400" : "border-warm-200 focus:border-warm-500"} rounded-sm px-3.5 py-2.5 text-sm text-dark placeholder:text-warm-400 outline-none transition-colors`;
}

function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-dark mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-warm-500 font-normal ml-1">(opzionale)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
