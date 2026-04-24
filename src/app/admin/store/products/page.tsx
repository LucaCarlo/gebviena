"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Check, X, Image as ImageIcon } from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  priceCents: number;
  stockQty: number | null;
  isDefault: boolean;
  isPublished: boolean;
  volumeM3: string | number;
}

interface StoreProduct {
  id: string;
  isPublished: boolean;
  sortOrder: number;
  coverImage: string | null;
  product: { id: string; name: string; slug: string; category: string; imageUrl: string; coverImage: string | null; isActive: boolean };
  storeCategory: { id: string; slug: string; translations: { languageCode: string; name: string }[] } | null;
  variants: Variant[];
  _count: { variants: number };
}

interface Category {
  id: string;
  slug: string;
  translations: { languageCode: string; name: string }[];
}

function formatPriceRange(variants: Variant[]): string {
  if (variants.length === 0) return "—";
  const prices = variants.map((v) => v.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === 0 && max === 0) return "— da definire";
  const fmt = (c: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(c / 100);
  return min === max ? fmt(min) : `da ${fmt(min)}`;
}

export default function StoreProductsListPage() {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [pubFilter, setPubFilter] = useState<"" | "true" | "false">("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (catFilter) params.set("categoryId", catFilter);
    if (pubFilter) params.set("published", pubFilter);
    if (search) params.set("q", search);
    const [itemsRes, catsRes] = await Promise.all([
      fetch(`/api/store/products?${params}`).then((r) => r.json()),
      fetch(`/api/store/categories`).then((r) => r.json()),
    ]);
    if (itemsRes.success) setItems(itemsRes.data);
    if (catsRes.success) setCats(catsRes.data);
    setLoading(false);
  }, [catFilter, pubFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const categoryLabel = useMemo(() => {
    return (c: StoreProduct["storeCategory"]) => {
      if (!c) return "—";
      return c.translations.find((t) => t.languageCode === "it")?.name || c.slug;
    };
  }, []);

  const stockLabel = (variants: Variant[]) => {
    if (variants.length === 0) return "—";
    const tracked = variants.some((v) => v.stockQty !== null);
    if (!tracked) return "∞";
    const total = variants.reduce((s, v) => s + (v.stockQty ?? 0), 0);
    return total.toString();
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">Prodotti Store</h1>
          <p className="text-sm text-warm-500 mt-1">
            Prodotti vendibili online. Ognuno è legato a un prodotto del catalogo.
          </p>
        </div>
        <div className="text-sm text-warm-500">{items.length} prodotti</div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-warm-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o slug…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tutte le categorie</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.translations.find((t) => t.languageCode === "it")?.name || c.slug}
            </option>
          ))}
        </select>
        <select
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value as "" | "true" | "false")}
          className="px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tutti gli stati</option>
          <option value="true">Pubblicati</option>
          <option value="false">Bozze</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun prodotto. Esegui <code className="px-1.5 py-0.5 bg-warm-100 rounded text-xs">npm run seed:store-products</code> per generare gli StoreProduct da ogni Product attivo.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left">Prodotto</th>
                <th className="px-4 py-3 text-left">Categoria shop</th>
                <th className="px-4 py-3 text-left">Varianti</th>
                <th className="px-4 py-3 text-left">Prezzo</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Pubblicato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {items.map((sp) => {
                const img = sp.coverImage || sp.product.coverImage || sp.product.imageUrl;
                return (
                  <tr key={sp.id} className="hover:bg-warm-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/store/products/${sp.id}`} className="block">
                        {img ? (
                          <div className="w-12 h-12 rounded bg-warm-100 bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                        ) : (
                          <div className="w-12 h-12 rounded bg-warm-100 flex items-center justify-center text-warm-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/store/products/${sp.id}`} className="block">
                        <div className="font-medium text-warm-900">{sp.product.name}</div>
                        <div className="text-xs text-warm-400 font-mono">{sp.product.slug}</div>
                        <div className="text-xs text-warm-500 mt-0.5">{sp.product.category}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-warm-700">{categoryLabel(sp.storeCategory)}</td>
                    <td className="px-4 py-3 text-warm-700">{sp._count.variants}</td>
                    <td className="px-4 py-3 text-warm-700">{formatPriceRange(sp.variants)}</td>
                    <td className="px-4 py-3 text-warm-700">{stockLabel(sp.variants)}</td>
                    <td className="px-4 py-3">
                      {sp.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Check size={12} /> Pubblicato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded">
                          <X size={12} /> Bozza
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
