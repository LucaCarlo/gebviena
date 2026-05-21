"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";
import AuthForms from "./AuthForms";

const inputCls = "w-full border border-warm-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-warm-900";
const btnCls = "inline-flex items-center gap-2 py-2.5 px-5 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] disabled:bg-warm-400 hover:bg-black transition-colors";

export default function ProfileForm() {
  const t = useStoreT();
  const { customer, loading, refresh } = useCustomerAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState<string | null>(null);

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
      if (!res.ok || !j.success) setErr(j.error || t("Errore salvataggio", "Erreur d'enregistrement"));
      else { setSavedAt(Date.now()); await refresh(); }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">{t("Caricamento…", "Chargement…")}</div>;
  if (!customer) return <AuthForms />;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="max-w-2xl">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> {t("Area riservata", "Espace personnel")}
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">{t("Il tuo profilo", "Votre profil")}</h1>

      <form onSubmit={save} className="border border-warm-200 p-6 space-y-5 mb-10">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500">{t("Dati personali", "Données personnelles")}</div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{t("Email", "E-mail")}</span>
          <input disabled value={customer.email} className={`${inputCls} bg-warm-50 text-warm-500`} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{t("Nome", "Prénom")}</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{t("Cognome", "Nom")}</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-1.5">{t("Telefono", "Téléphone")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </label>

        <label className="flex items-start gap-2 text-xs text-warm-600">
          <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5" />
          <span>{t("Desidero ricevere comunicazioni commerciali e promozioni.", "Je souhaite recevoir des communications commerciales et des promotions.")}</span>
        </label>

        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className={btnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("Salva", "Enregistrer")}
          </button>
          {savedAt > 0 && <span className="text-xs text-green-700">{t("Salvato", "Enregistré")}</span>}
        </div>
      </form>

      <div className="text-xs text-warm-500 leading-relaxed">
        {t(
          "L'accesso al tuo account avviene tramite link via email (senza password). Non è quindi necessario impostarne una.",
          "L'accès à votre compte se fait par lien envoyé par e-mail (sans mot de passe). Il n'est donc pas nécessaire d'en définir un.",
        )}
      </div>
      </div>
    </div>
  );
}
