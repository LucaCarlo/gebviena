"use client";

import { useState } from "react";
import { LogIn, UserPlus, Loader2, Mail, Check } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";

type Tab = "login" | "register";
type Mode = "password" | "magic-link" | "forgot";

export default function AuthForms() {
  const t = useStoreT();
  const [tab, setTab] = useState<Tab>("login");
  const [mode, setMode] = useState<Mode>("password");
  const [magicSent, setMagicSent] = useState(false);
  const { refresh } = useCustomerAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register state
  const [rFirst, setRFirst] = useState("");
  const [rLast, setRLast] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rMarketing, setRMarketing] = useState(false);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/store/public/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        setError(j.error || t("Errore di accesso", "Erreur de connexion"));
      } else {
        await refresh();
      }
    } catch {
      setError(t("Errore di rete", "Erreur réseau"));
    } finally {
      setLoading(false);
    }
  }

  async function doMagicLinkRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const purpose = mode === "forgot" ? "password_reset" : "magic_link";
      await fetch("/api/store/public/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      // Risposta intenzionalmente neutra (anche se l'email non esiste).
      setMagicSent(true);
    } catch {
      setError(t("Errore di rete", "Erreur réseau"));
    } finally {
      setLoading(false);
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/store/public/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: rEmail,
          password: rPassword,
          firstName: rFirst,
          lastName: rLast,
          phone: rPhone,
          marketingOptIn: rMarketing,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        setError(j.error || t("Errore nella registrazione", "Erreur lors de l'inscription"));
      } else {
        await refresh();
      }
    } catch {
      setError(t("Errore di rete", "Erreur réseau"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10"><div className="max-w-lg mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light text-warm-900 mb-2">{t("Area riservata", "Espace personnel")}</h1>
        <p className="text-sm text-warm-600">{t("Accedi o registrati per gestire i tuoi ordini e i preferiti.", "Connectez-vous ou inscrivez-vous pour gérer vos commandes et vos favoris.")}</p>
      </div>

      <div className="grid grid-cols-2 mb-8 border-b border-warm-200">
        <button
          onClick={() => { setTab("login"); setError(null); }}
          className={`py-3 text-xs uppercase tracking-[0.2em] transition-colors ${tab === "login" ? "text-warm-900 border-b-2 border-warm-900 -mb-px font-medium" : "text-warm-500 hover:text-warm-900"}`}
        >
          <LogIn size={14} className="inline mr-2 align-middle" /> {t("Accedi", "Se connecter")}
        </button>
        <button
          onClick={() => { setTab("register"); setError(null); }}
          className={`py-3 text-xs uppercase tracking-[0.2em] transition-colors ${tab === "register" ? "text-warm-900 border-b-2 border-warm-900 -mb-px font-medium" : "text-warm-500 hover:text-warm-900"}`}
        >
          <UserPlus size={14} className="inline mr-2 align-middle" /> {t("Registrati", "S'inscrire")}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {tab === "login" ? (
        magicSent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-6 rounded text-sm leading-relaxed text-center">
            <Check size={28} className="mx-auto mb-3 text-emerald-600" />
            <div className="font-medium mb-1">{t("Email inviata", "E-mail envoyé")}</div>
            <div className="text-emerald-700 text-[13px]">
              {t("Se l'indirizzo", "Si l'adresse")} <strong>{email}</strong> {t("è registrato, ti abbiamo inviato un link di accesso. Controlla la tua casella (anche lo spam).", "est enregistrée, nous vous avons envoyé un lien de connexion. Vérifiez votre boîte de réception (et les spams).")}
            </div>
            <button
              type="button"
              onClick={() => { setMagicSent(false); setMode("password"); setError(null); }}
              className="mt-5 text-warm-600 underline text-[12px] hover:text-warm-900"
            >
              {t("Torna al login", "Retour à la connexion")}
            </button>
          </div>
        ) : mode === "password" ? (
          <form onSubmit={doLogin} className="space-y-5">
            <Field label={t("Email", "E-mail")}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
            </Field>
            <Field label={t("Password", "Mot de passe")}>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
            </Field>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={14} />}
              {t("Accedi", "Se connecter")}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button type="button" onClick={() => { setMode("magic-link"); setError(null); }} className="text-warm-600 hover:text-warm-900 inline-flex items-center gap-1">
                <Mail size={12} /> {t("Accedi via email", "Se connecter par e-mail")}
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="text-warm-600 hover:text-warm-900">
                {t("Password dimenticata?", "Mot de passe oublié ?")}
              </button>
            </div>
          </form>
        ) : (
          // mode === "magic-link" o "forgot"
          <form onSubmit={doMagicLinkRequest} className="space-y-5">
            <div className="text-[13px] text-warm-700 leading-relaxed">
              {mode === "forgot"
                ? t("Inserisci la tua email: ti invieremo un link per scegliere una nuova password.", "Saisissez votre e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.")
                : t("Inserisci la tua email: ti invieremo un link per accedere senza password (3 utilizzi, validi 7 giorni).", "Saisissez votre e-mail : nous vous enverrons un lien pour vous connecter sans mot de passe (3 utilisations, valable 7 jours).")}
            </div>
            <Field label={t("Email", "E-mail")}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
            </Field>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={14} />}
              {mode === "forgot" ? t("Invia link reset", "Envoyer le lien de réinitialisation") : t("Invia link di accesso", "Envoyer le lien de connexion")}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode("password"); setError(null); }} className="text-warm-600 hover:text-warm-900 text-[12px] underline">
                {t("Torna al login con password", "Retour à la connexion par mot de passe")}
              </button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={doRegister} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("Nome", "Prénom")}>
              <input required value={rFirst} onChange={(e) => setRFirst(e.target.value)} className={inputCls} autoComplete="given-name" />
            </Field>
            <Field label={t("Cognome", "Nom")}>
              <input required value={rLast} onChange={(e) => setRLast(e.target.value)} className={inputCls} autoComplete="family-name" />
            </Field>
          </div>
          <Field label={t("Email", "E-mail")}>
            <input type="email" required value={rEmail} onChange={(e) => setREmail(e.target.value)} className={inputCls} autoComplete="email" />
          </Field>
          <Field label={t("Telefono (opzionale)", "Téléphone (facultatif)")}>
            <input value={rPhone} onChange={(e) => setRPhone(e.target.value)} className={inputCls} autoComplete="tel" />
          </Field>
          <Field label={t("Password (min. 8 caratteri)", "Mot de passe (min. 8 caractères)")}>
            <input type="password" required minLength={8} value={rPassword} onChange={(e) => setRPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
          </Field>
          <label className="flex items-start gap-2 text-xs text-warm-600">
            <input type="checkbox" checked={rMarketing} onChange={(e) => setRMarketing(e.target.checked)} className="mt-0.5" />
            <span>{t("Desidero ricevere comunicazioni commerciali e promozioni.", "Je souhaite recevoir des communications commerciales et des promotions.")}</span>
          </label>
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={14} />}
            {t("Crea account", "Créer un compte")}
          </button>
        </form>
      )}
    </div></div>
  );
}

const inputCls = "w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900";
const btnCls = "w-full inline-flex items-center justify-center gap-2 py-3 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] disabled:bg-warm-400 hover:bg-black transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
