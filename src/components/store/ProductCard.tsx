"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  coverImage: string | null;
  hoverImage: string | null;
  colors: { id: string; code: string; hex: string | null }[];
  priceFromCents: number;
  variantsCount: number;
  inStock: boolean;
  category: { slug: string; name: string } | null;
}

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function ProductCard({ p, favorited, onFavoriteChange }: {
  p: ProductCardData;
  favorited?: boolean;
  onFavoriteChange?: (isFav: boolean) => void;
}) {
  const { customer } = useCustomerAuth();
  const [isFav, setIsFav] = useState(!!favorited);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => { setIsFav(!!favorited); }, [favorited]);

  const toggleFav = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!customer) { window.location.href = "/account"; return; }
    if (busy) return;
    setBusy(true);
    try {
      if (isFav) {
        await fetch(`/api/store/public/favorites?storeProductId=${p.id}`, { method: "DELETE" });
        setIsFav(false);
        onFavoriteChange?.(false);
      } else {
        await fetch("/api/store/public/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeProductId: p.id }),
        });
        setIsFav(true);
        onFavoriteChange?.(true);
      }
    } finally { setBusy(false); }
  }, [customer, busy, isFav, p.id, onFavoriteChange]);

  return (
    <Link
      href={`/prodotti/${p.slug}`}
      className="group block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative aspect-[4/5] bg-warm-100 overflow-hidden">
        {/* Cover (sempre presente) */}
        {p.coverImage && (
          <Image
            src={p.coverImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={`object-cover transition-opacity duration-500 ${hover && p.hoverImage ? "opacity-0" : "opacity-100"}`}
          />
        )}
        {/* Hover image (crossfade) */}
        {p.hoverImage && (
          <Image
            src={p.hoverImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={`object-cover transition-all duration-500 scale-105 ${hover ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Cuore preferito */}
        <button
          onClick={toggleFav}
          title={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          aria-pressed={isFav}
          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center transition-all ${
            isFav ? "text-red-500" : "text-neutral-500 hover:text-neutral-900"
          } ${busy ? "opacity-60" : ""}`}
        >
          <Heart size={16} strokeWidth={1.8} fill={isFav ? "currentColor" : "none"} />
        </button>

        {/* Overlay quick info on hover */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-4 py-3 text-white text-[11px] uppercase tracking-[0.15em] transition-opacity duration-300 pointer-events-none ${
            hover ? "opacity-100" : "opacity-0"
          }`}
        >
          {p.variantsCount > 1 ? `${p.variantsCount} varianti` : "Scopri"}
        </div>

        {!p.inStock && (
          <div className="absolute top-3 left-3 bg-warm-900 text-white text-[10px] uppercase tracking-wider px-2 py-1">
            Esaurito
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {p.category && (
          <div className="text-[10px] uppercase tracking-[0.15em] text-warm-500">{p.category.name}</div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-warm-900 truncate">{p.name}</div>
          <div className="text-sm font-mono text-warm-900 shrink-0">
            {p.variantsCount > 1 ? "da " : ""}{eur(p.priceFromCents)}
          </div>
        </div>

        {/* Color swatches */}
        {p.colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {p.colors.slice(0, 5).map((c) => (
              <span
                key={c.id}
                title={c.code}
                className="w-3.5 h-3.5 rounded-full border border-warm-200"
                style={{ backgroundColor: c.hex || "#ddd" }}
              />
            ))}
            {p.colors.length > 5 && (
              <span className="text-[10px] text-warm-400">+{p.colors.length - 5}</span>
            )}
          </div>
        )}

        {p.shortDescription && (
          <div className="text-xs text-warm-500 line-clamp-1">{p.shortDescription}</div>
        )}
      </div>
    </Link>
  );
}
