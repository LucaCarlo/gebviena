"use client";

import { useState, type FormEvent } from "react";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import { useLang } from "@/contexts/I18nContext";

/**
 * Form contatti "Assistenza" inline nel footer dello store.
 * Compatto (3 input + textarea + bottone) protetto da reCAPTCHA Enterprise.
 * Submit a /api/contact (type=store_assistance) — mail recapitata all'admin_email.
 */
export default function AssistanceContactForm() {
  const isFr = useLang() === "fr";
  const { executeRecaptcha } = useRecaptcha();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (it: string, fr: string) => (isFr ? fr : it);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    const msg = message.trim();
    if (!fn || !ln || !em || !msg) {
      setError(t("Compila tutti i campi.", "Veuillez remplir tous les champs."));
      return;
    }

    setSubmitting(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha("store_assistance") : "";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${fn} ${ln}`,
          email: em,
          message: msg,
          type: "store_assistance",
          recaptchaToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || t("Errore invio", "Erreur d'envoi"));
      }
      setDone(true);
      setFirstName(""); setLastName(""); setEmail(""); setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Errore invio", "Erreur d'envoi"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center text-[12px] text-warm-700 py-2">
        <div className="font-medium">{t("Messaggio inviato.", "Message envoyé.")}</div>
        <div className="text-warm-500 mt-0.5">
          {t("Grazie, ti contatteremo a breve.", "Merci, nous vous contacterons bientôt.")}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto text-left space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t("Nome", "Prénom")}
          required
          autoComplete="given-name"
          className="w-full px-3 py-2 border border-warm-200 text-[12px] bg-white focus:outline-none focus:border-warm-500"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t("Cognome", "Nom")}
          required
          autoComplete="family-name"
          className="w-full px-3 py-2 border border-warm-200 text-[12px] bg-white focus:outline-none focus:border-warm-500"
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("Email", "Email")}
        required
        autoComplete="email"
        className="w-full px-3 py-2 border border-warm-200 text-[12px] bg-white focus:outline-none focus:border-warm-500"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("Messaggio", "Message")}
        required
        rows={3}
        className="w-full px-3 py-2 border border-warm-200 text-[12px] bg-white focus:outline-none focus:border-warm-500 resize-none"
      />

      {error && (
        <div className="text-[11px] text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2 text-[12px] bg-warm-900 text-white hover:bg-warm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
      >
        {submitting ? t("Invio…", "Envoi…") : t("Invia", "Envoyer")}
      </button>

      <p className="text-[9px] text-warm-400 leading-tight text-center pt-1">
        {t("Protetto da reCAPTCHA.", "Protégé par reCAPTCHA.")}
      </p>
    </form>
  );
}
