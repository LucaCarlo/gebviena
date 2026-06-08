"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import { useLang } from "@/contexts/I18nContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal del footer store "Assistenza": form mini (nome, cognome, email, messaggio)
 * protetto da reCAPTCHA Enterprise. POST a /api/contact con type="store_assistance".
 * La mail di destinazione è l'admin_email configurato (stesso indirizzo che era
 * mostrato in chiaro prima).
 */
export default function AssistanceContactModal({ open, onClose }: Props) {
  const isFr = useLang() === "fr";
  const { executeRecaptcha } = useRecaptcha();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset stato all'apertura
  useEffect(() => {
    if (open) {
      setDone(false);
      setError(null);
    }
  }, [open]);

  // ESC chiude
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-warm-900 hover:bg-warm-100 transition-colors"
          aria-label={t("Chiudi", "Fermer")}
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-6 pb-5 border-b border-warm-200">
          <div className="text-[11px] uppercase tracking-[0.18em] text-warm-500 mb-1">
            {t("Assistenza", "Assistance")}
          </div>
          <h2 className="text-lg font-medium text-warm-900">
            {t("Scrivici", "Écrivez-nous")}
          </h2>
          <p className="text-[12px] text-warm-500 mt-1">
            {t(
              "Ti risponderemo via email entro 1 giorno lavorativo.",
              "Nous vous répondrons par email dans un jour ouvré.",
            )}
          </p>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="text-warm-900 font-medium">
              {t("Messaggio inviato.", "Message envoyé.")}
            </div>
            <div className="text-[13px] text-warm-500 mt-1">
              {t("Grazie, ti contatteremo a breve.", "Merci, nous vous contacterons bientôt.")}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center px-4 py-2 text-[13px] bg-warm-900 text-white hover:bg-warm-700 transition-colors"
            >
              {t("Chiudi", "Fermer")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-500 mb-1">
                  {t("Nome", "Prénom")}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="w-full px-3 py-2 border border-warm-200 text-[13px] focus:outline-none focus:border-warm-500"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-500 mb-1">
                  {t("Cognome", "Nom")}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="w-full px-3 py-2 border border-warm-200 text-[13px] focus:outline-none focus:border-warm-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-warm-500 mb-1">
                {t("Email", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-warm-200 text-[13px] focus:outline-none focus:border-warm-500"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-warm-500 mb-1">
                {t("Messaggio", "Message")}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-warm-200 text-[13px] focus:outline-none focus:border-warm-500 resize-none"
              />
            </div>

            {error && (
              <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                {error}
              </div>
            )}

            <p className="text-[10px] text-warm-400 leading-tight">
              {t(
                "Protetto da reCAPTCHA. Si applicano l'Informativa sulla privacy e i Termini di servizio di Google.",
                "Protégé par reCAPTCHA. La Politique de confidentialité et les Conditions d'utilisation de Google s'appliquent.",
              )}
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 text-[13px] bg-warm-900 text-white hover:bg-warm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t("Invio…", "Envoi…") : t("Invia messaggio", "Envoyer le message")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
