"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ReimpostaPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/professionals/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || "Errore di connessione");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/area-professionisti/accesso"), 3000);
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
          <h1 className="text-2xl md:text-3xl font-serif text-warm-900 mb-2">Reimposta password</h1>
          <p className="text-sm text-warm-600">Scegli una nuova password per il tuo account.</p>
        </div>

        {done ? (
          <div className="bg-white border border-warm-200 p-6 md:p-8 rounded text-center">
            <div className="text-emerald-700 font-medium mb-3">✓ Password aggiornata</div>
            <p className="text-sm text-warm-700">Ti stiamo reindirizzando al login…</p>
            <div className="mt-6">
              <Link
                href="/area-professionisti/accesso"
                className="text-[12px] uppercase tracking-[0.15em] text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
              >
                Vai al login ora
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white border border-warm-200 p-6 md:p-8 rounded space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-warm-700 mb-1.5">
                Nuova password *
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-warm-300 px-3 py-2.5 pr-10 text-sm focus:border-warm-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-warm-500 hover:text-warm-900"
                  aria-label={showPwd ? "Nascondi password" : "Mostra password"}
                >
                  <span className="text-lg leading-none">{showPwd ? "🙈" : "👁"}</span>
                </button>
              </div>
              <p className="text-[11px] text-warm-500 mt-1">Minimo 8 caratteri</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-warm-700 mb-1.5">
                Conferma password *
              </label>
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-warm-300 px-3 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !password || !confirmPassword}
              className="w-full bg-warm-900 text-white uppercase text-sm tracking-[0.12em] py-3 hover:bg-black transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Aggiorna password
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
