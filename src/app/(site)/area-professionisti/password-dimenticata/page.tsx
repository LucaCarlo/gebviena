"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function PasswordDimenticataPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/professionals/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || "Errore di connessione");
        return;
      }
      setDone(true);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-warm-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif text-warm-900 mb-2">Password dimenticata?</h1>
          <p className="text-sm text-warm-600">
            Inserisci l&apos;email del tuo account. Ti manderemo un link per reimpostare la password.
          </p>
        </div>

        {done ? (
          <div className="bg-white border border-warm-200 p-6 md:p-8 rounded">
            <div className="text-center">
              <div className="text-emerald-700 font-medium mb-3">✓ Email inviata</div>
              <p className="text-sm text-warm-700 leading-relaxed">
                Se l&apos;indirizzo <strong>{email}</strong> è registrato, riceverai a breve un&apos;email con
                le istruzioni per reimpostare la password. Il link è valido per 1 ora.
              </p>
              <p className="text-xs text-warm-500 mt-4">
                Controlla anche la cartella spam se non vedi l&apos;email tra 5 min.
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/area-professionisti/accesso"
                className="text-[12px] uppercase tracking-[0.15em] text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
              >
                Torna al login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white border border-warm-200 p-6 md:p-8 rounded space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-warm-700 mb-1.5">
                Indirizzo email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-warm-300 px-3 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full bg-warm-900 text-white uppercase text-sm tracking-[0.12em] py-3 hover:bg-black transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Invia link di recupero
            </button>

            <div className="pt-2 text-center border-t border-warm-100">
              <Link
                href="/area-professionisti/accesso"
                className="text-[12px] uppercase tracking-[0.15em] text-warm-700 hover:text-warm-900"
              >
                Torna al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
