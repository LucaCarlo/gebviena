"use client";

import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";
import { useStoreT } from "@/lib/use-store-t";

/**
 * Accesso area riservata PASSWORDLESS.
 * L'utente inserisce solo l'email → riceve un'email con il link di accesso.
 * Cliccando il link entra e la sessione resta salvata 2 mesi sul dispositivo.
 * Nessuna password, nessuna registrazione.
 */
export default function AuthForms() {
  const t = useStoreT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("Inserisci un'email valida.", "Saisissez une adresse e-mail valide."));
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/store/public/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "magic_link" }),
      });
      // Risposta neutra (anche se l'email non esiste) per non rivelare gli account.
      setSent(true);
    } catch {
      setError(t("Errore di rete. Riprova.", "Erreur réseau. Réessayez."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-warm-900 mb-2">{t("Area riservata", "Espace personnel")}</h1>
          <p className="text-sm text-warm-600">
            {t(
              "Accesso senza password: inserisci la tua email e ti invieremo un link per entrare.",
              "Accès sans mot de passe : saisissez votre e-mail et nous vous enverrons un lien de connexion.",
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-6 rounded text-sm leading-relaxed text-center">
            <Check size={28} className="mx-auto mb-3 text-emerald-600" />
            <div className="font-medium mb-1">{t("Email inviata", "E-mail envoyé")}</div>
            <div className="text-emerald-700 text-[13px]">
              {t("Se l'indirizzo", "Si l'adresse")} <strong>{email}</strong>{" "}
              {t(
                "è registrato, ti abbiamo inviato un link per accedere. Controlla la posta (anche lo spam). L'accesso resterà salvato su questo dispositivo per 2 mesi.",
                "est enregistrée, nous vous avons envoyé un lien de connexion. Vérifiez votre boîte (et les spams). L'accès restera mémorisé sur cet appareil pendant 2 mois.",
              )}
            </div>
            <button
              type="button"
              onClick={() => { setSent(false); setError(null); }}
              className="mt-5 text-warm-600 underline text-[12px] hover:text-warm-900"
            >
              {t("Usa un'altra email", "Utiliser une autre adresse")}
            </button>
          </div>
        ) : (
          <form onSubmit={requestLink} className="space-y-5">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{t("Email", "E-mail")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900"
                autoComplete="email"
                placeholder="email@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] disabled:bg-warm-400 hover:bg-black transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={14} />}
              {t("Ricevi link di accesso", "Recevoir le lien de connexion")}
            </button>
            <p className="text-[11px] text-warm-500 text-center leading-relaxed">
              {t(
                "Niente password da ricordare. Riceverai un'email con un link sicuro per entrare nella tua area.",
                "Aucun mot de passe à retenir. Vous recevrez un e-mail avec un lien sécurisé pour accéder à votre espace.",
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
