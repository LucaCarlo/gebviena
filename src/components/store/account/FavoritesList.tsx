"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, Heart, X } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import AuthForms from "./AuthForms";

interface Favorite {
  id: string;
  storeProductId: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  coverImage: string | null;
  priceFromCents: number;
  variantsCount: number;
  inStock: boolean;
}

function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function FavoritesList() {
  const { customer, loading } = useCustomerAuth();
  const [items, setItems] = useState<Favorite[] | null>(null);

  const load = () => {
    fetch("/api/store/public/favorites?lang=it", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.success ? d.data : []))
      .catch(() => setItems([]));
  };

  useEffect(() => { if (customer) load(); }, [customer]);

  async function remove(storeProductId: string) {
    await fetch(`/api/store/public/favorites?storeProductId=${storeProductId}`, { method: "DELETE" });
    setItems((prev) => prev ? prev.filter((i) => i.storeProductId !== storeProductId) : prev);
  }

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">Caricamento…</div>;
  if (!customer) return <AuthForms />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> Area riservata
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">I tuoi preferiti</h1>

      {items === null ? (
        <div className="text-warm-500 text-sm">Caricamento…</div>
      ) : items.length === 0 ? (
        <div className="border border-warm-200 p-12 text-center">
          <Heart size={32} className="mx-auto text-warm-400 mb-4" />
          <div className="text-warm-600 mb-4">Non hai ancora prodotti preferiti.</div>
          <Link href="/" className="inline-block text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5 hover:text-warm-600">
            Scopri il catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <div key={p.id} className="group relative">
              <button
                onClick={() => remove(p.storeProductId)}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-warm-600 hover:text-red-600 shadow-sm"
                title="Rimuovi dai preferiti"
              >
                <X size={14} />
              </button>
              <Link href={`/prodotti/${p.slug}`} className="block">
                <div className="aspect-[4/5] bg-warm-100 relative overflow-hidden">
                  {p.coverImage && (
                    <Image src={p.coverImage} alt={p.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  {!p.inStock && (
                    <div className="absolute top-3 left-3 bg-warm-900 text-white text-[10px] uppercase tracking-wider px-2 py-1">
                      Esaurito
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-sm font-medium text-warm-900">{p.name}</div>
                  {p.shortDescription && <div className="text-xs text-warm-500 line-clamp-1">{p.shortDescription}</div>}
                  <div className="text-sm font-mono text-warm-900 pt-1">
                    {p.variantsCount > 1 ? "da " : ""}{eur(p.priceFromCents)}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
