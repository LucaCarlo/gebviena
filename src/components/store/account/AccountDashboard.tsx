"use client";

import Link from "next/link";
import { Package, Heart, UserCircle2, LogOut, Truck } from "lucide-react";
import { useCustomerAuth, type StoreCustomer } from "@/contexts/CustomerAuthContext";

export default function AccountDashboard({ customer }: { customer: StoreCustomer }) {
  const { logout } = useCustomerAuth();
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-wrap items-end justify-between mb-10 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-warm-500 mb-1">Area riservata</div>
          <h1 className="text-3xl font-light text-warm-900">Ciao, {fullName}</h1>
          <div className="text-sm text-warm-500 mt-1">{customer.email}</div>
        </div>
        <button
          onClick={async () => { await logout(); window.location.href = "/"; }}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-warm-600 hover:text-warm-900"
        >
          <LogOut size={14} /> Esci
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile href="/account/orders" icon={<Package size={20} />} title="I miei ordini" desc="Storico, stato e tracking delle spedizioni." />
        <Tile href="/account/favorites" icon={<Heart size={20} />} title="Preferiti" desc="I prodotti che hai salvato." />
        <Tile href="/account/profile" icon={<UserCircle2 size={20} />} title="Profilo" desc="Dati personali, contatti e password." />
      </div>

      <div className="mt-10 border-t border-warm-200 pt-6 text-sm text-warm-500 flex items-center gap-2">
        <Truck size={14} /> Le spedizioni e il tracking sono gestiti dopo la conferma dell&apos;ordine.
      </div>
    </div>
  );
}

function Tile({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="block p-6 border border-warm-200 hover:border-warm-900 transition-colors">
      <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-warm-700 mb-4">{icon}</div>
      <div className="text-base font-medium text-warm-900 mb-1">{title}</div>
      <div className="text-sm text-warm-500">{desc}</div>
    </Link>
  );
}
