"use client";

import { useState } from "react";
import { LogIn, UserPlus, Loader2, Mail, Check } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

type Tab = "login" | "register";
type Mode = "password" | "magic-link" | "forgot";

export default function AuthForms() {
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
        setError(j.error || "Errore di accesso");
      } else {
        await refresh();
      }
    } catch {
      setError("Errore di rete");
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
      setError("Errore di rete");
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
        setError(j.error || "Errore nella registrazione");
      } else {
        await refresh();
      }
    } catch {
      setError("Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light text-warm-900 mb-2">Area riservata</h1>
        <p className="text-sm text-warm-600">Accedi o registrati per gestire i tuoi ordini e i preferiti.</p>
      </div>

      <div className="grid grid-cols-2 mb-8 border-b border-warm-200">
        <button
          onClick={() => { setTab("login"); setError(null); }}
          className={`py-3 text-xs uppercase tracking-[0.2em] transition-colors ${tab === "login" ? "text-warm-900 border-b-2 border-warm-900 -mb-px font-medium" : "text-warm-500 hover:text-warm-900"}`}
        >
          <LogIn size={14} className="inline mr-2 align-middle" /> Accedi
        </button>
        <button
          onClick={() => { setTab("register"); setError(null); }}
          className={`py-3 text-xs uppercase tracking-[0.2em] transition-colors ${tab === "register" ? "text-warm-900 border-b-2 border-warm-900 -mb-px font-medium" : "text-warm-500 hover:text-warm-900"}`}
        >
          <UserPlus size={14} className="inline mr-2 align-middle" /> Registrati
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
            <div className="font-medium mb-1">Email inviata</div>
            <div className="text-emerald-700 text-[13px]">
              Se l&apos;indirizzo <strong>{email}</strong> è registrato, ti abbiamo inviato un link di accesso.
              Controlla la tua casella (anche lo spam).
            </div>
            <button
              type="button"
              onClick={() => { setMagicSent(false); setMode("password"); setError(null); }}
              className="mt-5 text-warm-600 underline text-[12px] hover:text-warm-900"
            >
              Torna al login
            </button>
          </div>
        ) : mode === "password" ? (
          <form onSubmit={doLogin} className="space-y-5">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
            </Field>
            <Field label="Password">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
            </Field>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={14} />}
              Accedi
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button type="button" onClick={() => { setMode("magic-link"); setError(null); }} className="text-warm-600 hover:text-warm-900 inline-flex items-center gap-1">
                <Mail size={12} /> Accedi via email
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="text-warm-600 hover:text-warm-900">
                Password dimenticata?
              </button>
            </div>
          </form>
        ) : (
          // mode === "magic-link" o "forgot"
          <form onSubmit={doMagicLinkRequest} className="space-y-5">
            <div className="text-[13px] text-warm-700 leading-relaxed">
              {mode === "forgot"
                ? "Inserisci la tua email: ti invieremo un link per scegliere una nuova password."
                : "Inserisci la tua email: ti invieremo un link per accedere senza password (3 utilizzi, validi 7 giorni)."}
            </div>
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
            </Field>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={14} />}
              {mode === "forgot" ? "Invia link reset" : "Invia link di accesso"}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode("password"); setError(null); }} className="text-warm-600 hover:text-warm-900 text-[12px] underline">
                Torna al login con password
              </button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={doRegister} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome">
              <input required value={rFirst} onChange={(e) => setRFirst(e.target.value)} className={inputCls} autoComplete="given-name" />
            </Field>
            <Field label="Cognome">
              <input required value={rLast} onChange={(e) => setRLast(e.target.value)} className={inputCls} autoComplete="family-name" />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" required value={rEmail} onChange={(e) => setREmail(e.target.value)} className={inputCls} autoComplete="email" />
          </Field>
          <Field label="Telefono (opzionale)">
            <input value={rPhone} onChange={(e) => setRPhone(e.target.value)} className={inputCls} autoComplete="tel" />
          </Field>
          <Field label="Password (min. 8 caratteri)">
            <input type="password" required minLength={8} value={rPassword} onChange={(e) => setRPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
          </Field>
          <label className="flex items-start gap-2 text-xs text-warm-600">
            <input type="checkbox" checked={rMarketing} onChange={(e) => setRMarketing(e.target.checked)} className="mt-0.5" />
            <span>Desidero ricevere comunicazioni commerciali e promozioni.</span>
          </label>
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={14} />}
            Crea account
          </button>
        </form>
      )}
    </div>
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
