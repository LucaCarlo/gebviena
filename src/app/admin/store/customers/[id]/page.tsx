"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, Check, AlertCircle, User, MapPin, ShoppingCart, Mail } from "lucide-react";

interface Address {
  id: string;
  type: "SHIPPING" | "BILLING";
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  zip: string;
  provinceCode: string | null;
  regionCode: string | null;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  items: { id: string; quantity: number }[];
}

interface CustomerDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  taxCode: string | null;
  vatNumber: string | null;
  sdiCode: string | null;
  sdiPec: string | null;
  language: string;
  marketingOptIn: boolean;
  isActive: boolean;
  isGuest: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lifetimeCents: number;
  addresses: Address[];
  orders: OrderSummary[];
}

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", taxCode: "", vatNumber: "", sdiCode: "", sdiPec: "",
    isActive: true, marketingOptIn: false,
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/store/customers/${params.id}`).then((r) => r.json());
    if (res.success) {
      setCustomer(res.data);
      setForm({
        firstName: res.data.firstName || "",
        lastName: res.data.lastName || "",
        phone: res.data.phone || "",
        taxCode: res.data.taxCode || "",
        vatNumber: res.data.vatNumber || "",
        sdiCode: res.data.sdiCode || "",
        sdiPec: res.data.sdiPec || "",
        isActive: res.data.isActive,
        marketingOptIn: res.data.marketingOptIn,
      });
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/store/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Salvato", true);
        await fetchCustomer();
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-24 text-warm-500">
        Cliente non trovato. <Link href="/admin/store/customers" className="underline">Torna alla lista</Link>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link href="/admin/store/customers" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna alla lista
        </Link>
      </div>

      <header className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">{fullName}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-warm-500">
            <Mail size={12} /> {customer.email}
            {customer.isGuest ? (
              <span className="ml-2 text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded">Guest</span>
            ) : (
              <span className="ml-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Registrato</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-warm-500 uppercase tracking-wider">Lifetime value</div>
          <div className="text-xl font-mono font-semibold text-warm-900">
            {customer.lifetimeCents > 0 ? euro(customer.lifetimeCents, "EUR") : "—"}
          </div>
          <div className="text-xs text-warm-500 mt-1">{customer.orders.length} ordini totali</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: anagrafica + indirizzi */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
              <User size={16} /> Dati anagrafici
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Nome</label>
                <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Cognome</label>
                <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-warm-600 mb-1">Telefono</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
            </div>

            <h3 className="font-medium text-warm-900 mt-5 mb-3 text-sm">Fatturazione (per SDI / FatturaPA)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Codice fiscale</label>
                <input value={form.taxCode} onChange={(e) => setForm((f) => ({ ...f, taxCode: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Partita IVA</label>
                <input value={form.vatNumber} onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Codice destinatario SDI</label>
                <input value={form.sdiCode} onChange={(e) => setForm((f) => ({ ...f, sdiCode: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">PEC</label>
                <input value={form.sdiPec} onChange={(e) => setForm((f) => ({ ...f, sdiPec: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-warm-100">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Attivo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => setForm((f) => ({ ...f, marketingOptIn: e.target.checked }))} />
                Marketing opt-in
              </label>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm">
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
              <ShoppingCart size={16} /> Storia ordini ({customer.orders.length})
            </h2>
            {customer.orders.length === 0 ? (
              <div className="text-sm text-warm-400 italic">Nessun ordine ancora.</div>
            ) : (
              <div className="divide-y divide-warm-100">
                {customer.orders.map((o) => {
                  const totalItems = o.items.reduce((s, it) => s + it.quantity, 0);
                  return (
                    <Link
                      key={o.id}
                      href={`/admin/store/orders/${o.id}`}
                      className="flex items-center justify-between py-2.5 hover:bg-warm-50 -mx-6 px-6 transition-colors"
                    >
                      <div>
                        <div className="font-mono text-sm text-warm-900">{o.orderNumber}</div>
                        <div className="text-xs text-warm-500">
                          {new Date(o.createdAt).toLocaleDateString("it-IT")} · {totalItems} articoli · {o.status}
                        </div>
                      </div>
                      <div className="font-mono text-sm text-warm-900">{euro(o.totalCents, o.currency)}</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-900 mb-3 text-sm flex items-center gap-2">
              <MapPin size={14} /> Indirizzi ({customer.addresses.length})
            </h3>
            {customer.addresses.length === 0 ? (
              <div className="text-xs text-warm-400 italic">Nessun indirizzo salvato.</div>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((a) => (
                  <div key={a.id} className={`text-sm p-3 rounded border ${a.isDefault ? "border-warm-400 bg-warm-50" : "border-warm-200"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-warm-500">{a.type === "SHIPPING" ? "Spedizione" : "Fatturazione"}</span>
                      {a.isDefault && <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">default</span>}
                    </div>
                    <div className="text-warm-800">{a.firstName} {a.lastName}</div>
                    {a.company && <div className="text-warm-500 text-xs">{a.company}</div>}
                    <div className="text-warm-700">{a.street1}</div>
                    {a.street2 && <div className="text-warm-700">{a.street2}</div>}
                    <div className="text-warm-700">{a.zip} {a.city} {a.provinceCode && `(${a.provinceCode})`}</div>
                    <div className="text-warm-500 text-xs">{a.countryCode}</div>
                    {a.phone && <div className="text-warm-500 text-xs mt-1">☎ {a.phone}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-2">Timeline</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-warm-500">Registrato</dt><dd className="text-warm-800">{new Date(customer.createdAt).toLocaleDateString("it-IT")}</dd></div>
              {customer.lastLoginAt && (
                <div className="flex justify-between"><dt className="text-warm-500">Ultimo accesso</dt><dd className="text-warm-800">{new Date(customer.lastLoginAt).toLocaleDateString("it-IT")}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-warm-500">Lingua</dt><dd className="text-warm-800 uppercase">{customer.language}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
            toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
