"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Save, KeyRound } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import AuthForms from "./AuthForms";

const inputCls = "w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900";
const btnCls = "inline-flex items-center gap-2 py-2.5 px-5 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] disabled:bg-warm-400 hover:bg-black transition-colors";

export default function ProfileForm() {
  const { customer, loading, refresh } = useCustomerAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName || "");
      setLastName(customer.lastName || "");
      setPhone(customer.phone || "");
      setMarketingOptIn(!!customer.marketingOptIn);
    }
  }, [customer]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/store/public/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, marketingOptIn }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) setErr(j.error || "Errore salvataggio");
      else { setSavedAt(Date.now()); await refresh(); }
    } finally { setSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== newPw2) { setPwMsg({ type: "err", text: "Le due password non coincidono" }); return; }
    setPwBusy(true);
    try {
      const res = await fetch("/api/store/public/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) setPwMsg({ type: "err", text: j.error || "Errore" });
      else {
        setPwMsg({ type: "ok", text: "Password aggiornata" });
        setCurrentPw(""); setNewPw(""); setNewPw2("");
      }
    } finally { setPwBusy(false); }
  }

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">Caricamento…</div>;
  if (!customer) return <AuthForms />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> Area riservata
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">Il tuo profilo</h1>

      <form onSubmit={save} className="border border-warm-200 p-6 space-y-5 mb-10">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500">Dati personali</div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Email</span>
          <input disabled value={customer.email} className={`${inputCls} bg-warm-50 text-warm-500`} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Nome</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Cognome</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Telefono</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </label>

        <label className="flex items-start gap-2 text-xs text-warm-600">
          <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5" />
          <span>Desidero ricevere comunicazioni commerciali e promozioni.</span>
        </label>

        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className={btnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salva
          </button>
          {savedAt > 0 && <span className="text-xs text-green-700">Salvato</span>}
        </div>
      </form>

      <form onSubmit={changePassword} className="border border-warm-200 p-6 space-y-5">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500">Cambia password</div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Password attuale</span>
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputCls} autoComplete="current-password" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Nuova password</span>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} minLength={8} autoComplete="new-password" />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">Conferma nuova password</span>
            <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} className={inputCls} minLength={8} autoComplete="new-password" />
          </label>
        </div>

        {pwMsg && (
          <div className={`text-sm px-3 py-2 border ${pwMsg.type === "ok" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}`}>
            {pwMsg.text}
          </div>
        )}

        <button type="submit" disabled={pwBusy || !currentPw || !newPw} className={btnCls}>
          {pwBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Aggiorna password
        </button>
      </form>
    </div>
  );
}
