"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Trash2, Minus, Plus, Lock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreT } from "@/lib/use-store-t";

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function CartPage() {
  const { items, subtotalCents, count, updateQuantity, removeItem } = useCart();
  const t = useStoreT();

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-100 flex items-center justify-center">
          <ShoppingBag size={28} className="text-warm-500" />
        </div>
        <h1 className="text-2xl font-light text-warm-900 mb-3">{t("Il carrello è vuoto", "Votre panier est vide")}</h1>
        <p className="text-warm-600 text-sm leading-relaxed mb-8">
          {t("Esplora la collezione e aggiungi i prodotti che vuoi acquistare.", "Explorez la collection et ajoutez les produits que vous souhaitez acheter.")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800"
        >
          {t("Esplora lo shop", "Explorer la boutique")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <h1 className="text-3xl font-light text-warm-900 mb-8">{t("Carrello", "Panier")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex gap-4 p-4 border border-warm-200 rounded"
            >
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-warm-100 rounded overflow-hidden shrink-0">
                {item.coverImage && (
                  <Image
                    src={item.coverImage}
                    alt={item.productName}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/prodotti/${item.productSlug}`}
                  className="block text-warm-900 font-medium hover:underline"
                >
                  {item.productName}
                </Link>
                {item.variantAttributes && (
                  <div className="text-xs text-warm-500 mt-0.5">{item.variantAttributes}</div>
                )}
                <div className="text-[10px] text-warm-400 font-mono mt-1">SKU {item.sku}</div>

                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="inline-flex items-center border border-warm-300 rounded">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-2 py-1.5 hover:bg-warm-50"
                      aria-label={t("Diminuisci", "Diminuer")}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="px-2 py-1.5 hover:bg-warm-50"
                      aria-label={t("Aumenta", "Augmenter")}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="text-warm-900 font-medium">
                    {eur(item.priceCents * item.quantity)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeItem(item.variantId)}
                className="text-warm-400 hover:text-red-600 transition-colors self-start"
                aria-label={t("Rimuovi", "Retirer")}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 self-start space-y-4 p-6 border border-warm-200 rounded bg-warm-50/40">
          <h2 className="text-sm uppercase tracking-[0.2em] text-warm-500">{t("Riepilogo", "Récapitulatif")}</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-700">{t("Subtotale", "Sous-total")} ({count} {count === 1 ? t("prodotto", "produit") : t("prodotti", "produits")})</span>
              <span className="text-warm-900">{eur(subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-warm-500 text-xs">
              <span>{t("Spedizione", "Livraison")}</span>
              <span>{t("calcolata al checkout", "calculée au paiement")}</span>
            </div>
          </div>

          <div className="border-t border-warm-200 pt-3">
            <div className="flex justify-between items-baseline">
              <span className="text-warm-900 font-medium">{t("Totale parziale", "Total partiel")}</span>
              <span className="text-2xl font-light text-warm-900">{eur(subtotalCents)}</span>
            </div>
            <p className="text-[11px] text-warm-500 mt-1">{t("IVA inclusa, spedizione esclusa", "TVA incluse, livraison non comprise")}</p>
          </div>

          <Link
            href="/checkout"
            className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 transition-colors"
          >
            <Lock size={14} /> {t("Procedi al checkout", "Procéder au paiement")}
          </Link>

          <Link
            href="/"
            className="block text-center text-xs text-warm-600 hover:text-warm-900 underline"
          >
            {t("Continua a esplorare", "Continuer mes achats")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
