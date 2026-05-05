"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SubscribeForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inv") || "";
  const tracked = useRef(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    privacyAccepted: false,
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

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Campo obbligatorio";
    if (!form.lastName.trim()) e.lastName = "Campo obbligatorio";
    if (!form.email.trim()) e.email = "Campo obbligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email non valida";
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
      const res = await fetch("/api/landing/accesso-svendita-gtv/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, inviteToken: inviteToken || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setServerError(data.error || "Si è verificato un errore. Riprova.");
      }
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
        <h2 className="text-2xl font-medium text-dark mb-3">Richiesta inviata</h2>
        <p className="text-sm text-warm-600 leading-relaxed">
          Ti abbiamo inviato un&apos;email di conferma all&apos;indirizzo che ci hai fornito.
          A breve riceverai le istruzioni per accedere alla vendita speciale online.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-warm-50/40 border border-warm-200 rounded-sm p-7 md:p-9">
      <h2 className="text-2xl font-medium text-dark mb-1.5">Richiedi Accesso</h2>
      <p className="text-sm text-warm-600 mb-6">Registrati per accedere alla vendita speciale online.</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Nome" required error={errors.firstName}>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Inserisci il tuo nome"
            className={inputCls(!!errors.firstName)}
          />
        </Field>

        <Field label="Cognome" required error={errors.lastName}>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Inserisci il tuo cognome"
            className={inputCls(!!errors.lastName)}
          />
        </Field>

        <Field label="Email" required error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Inserisci la tua email"
            className={inputCls(!!errors.email)}
          />
        </Field>

        <Field label="Azienda" optional>
          <input
            type="text"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder="Inserisci il nome della tua azienda"
            className={inputCls(false)}
          />
        </Field>

        <label className="flex items-start gap-3 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.privacyAccepted}
            onChange={(e) => update("privacyAccepted", e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-dark shrink-0 cursor-pointer"
          />
          <span className={`text-xs leading-relaxed ${errors.privacyAccepted ? "text-red-600" : "text-warm-700"}`}>
            Accetto{" "}
            <Link href="/privacy-policy" target="_blank" className="underline hover:opacity-60">
              l&apos;informativa sulla privacy
            </Link>
            {" "}e il trattamento dei miei dati personali.
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
          {submitting ? "Invio..." : "Ottieni Accesso"}
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
