"use client";

import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export default function ShopGrid({ products }: { products: ProductCardData[] }) {
  const { customer } = useCustomerAuth();
  const [favSet, setFavSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!customer) { setFavSet(new Set()); return; }
    fetch("/api/store/public/favorites?lang=it", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ids = new Set((d.data as { storeProductId: string }[]).map((f) => f.storeProductId));
          setFavSet(ids);
        }
      })
      .catch(() => {});
  }, [customer]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-warm-600">
          {products.length} prodott{products.length === 1 ? "o" : "i"}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-warm-500 border border-warm-200 rounded-lg">
          Nessun prodotto trovato. Prova a modificare i filtri.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              favorited={favSet.has(p.id)}
              onFavoriteChange={(isFav) => {
                setFavSet((prev) => {
                  const next = new Set(prev);
                  if (isFav) next.add(p.id); else next.delete(p.id);
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
