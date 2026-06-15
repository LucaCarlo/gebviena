"use client";

import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";

const PAGE_SIZE = 20;

export default function ShopGrid({ products }: { products: ProductCardData[] }) {
  const { customer } = useCustomerAuth();
  const t = useStoreT();
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE_SIZE);

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

  // Reset visible count when the input list changes (search/filter change)
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [products]);

  const visible = products.slice(0, shown);
  const hasMore = shown < products.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-warm-600">
          {products.length === 0
            ? t("Nessun prodotto", "Aucun produit")
            : <>{t("Mostro", "Affichage de")} <strong>{visible.length}</strong> {t("di", "sur")} <strong>{products.length}</strong></>}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-warm-500 border border-warm-200 rounded-lg">
          {t("Nessun prodotto trovato. Prova a modificare i filtri.", "Aucun produit trouvé. Essayez de modifier les filtres.")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-6 sm:gap-6">
            {visible.map((p) => (
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

          {hasMore && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="px-8 py-3 border border-warm-900 text-warm-900 uppercase text-[12px] tracking-[0.18em] hover:bg-warm-900 hover:text-white transition-colors"
              >
                {t("Carica altri", "Charger plus")} ({Math.min(PAGE_SIZE, products.length - shown)})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
