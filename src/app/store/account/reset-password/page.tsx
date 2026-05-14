"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Check, XCircle } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-20 text-center text-warm-500 text-sm">Caricamento…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("t") || "";
  const { refresh } = useCustomerAuth();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <XCircle size={36} className="mx-auto text-red-500 mb-3" />
        <h1 className="text-xl font-light text-warm-900 mb-2">Link non valido</h1>
        <p className="text-warm-600 text-sm mb-6">Manca il token.</p>
        <Link href="/account" className="inline-block px-6 py-3 bg-warm-900 text-white uppercase text-xs tracking-[0.2em]">
          Torna al login
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw1.length < 8) { setError("La password deve avere almeno 8 caratteri."); return; }
    if (pw1 !== pw2) { setError("Le due password non corrispondono."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/store/public/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw1 }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        setError(j.error || "Link non valido o scaduto.");
        return;
      }
      await refresh();
      setDone(true);
      setTimeout(() => router.replace("/account"), 1200);
    } catch {
      setError("Errore di rete");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Check size={36} className="mx-auto text-emerald-600 mb-3" />
        <h1 className="text-xl font-light text-warm-900 mb-1">Password aggiornata</h1>
        <p className="text-warm-500 text-sm">Sei già loggato. Reindirizzamento…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Lock size={28} className="mx-auto text-warm-700 mb-3" />
        <h1 className="text-2xl font-light text-warm-900 mb-2">Nuova password</h1>
        <p className="text-sm text-warm-600">Scegli una nuova password per il tuo account.</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Nuova password (min. 8 caratteri)</span>
          <input type="password" required minLength={8} value={pw1} onChange={(e) => setPw1(e.target.value)} className="w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Ripeti password</span>
          <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900" autoComplete="new-password" />
        </label>
        <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-3 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] disabled:bg-warm-400 hover:bg-black transition-colors">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
          Aggiorna password
        </button>
      </form>
    </div>
  );
}
