"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { PRODUCT_CATEGORIES, CATEGORY_SUBCATEGORIES } from "@/lib/constants";
import type { Product } from "@/types";

const ITEMS_PER_PAGE = 16;

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get("category") || "TUTTI";
  const currentSubcategory = searchParams.get("subcategory") || null;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (currentSubcategory) params.set("subcategory", currentSubcategory);
    params.set("page", currentPage.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentCategory, currentSubcategory, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== "TUTTI") params.set("category", cat);
    router.push(`/prodotti?${params}`, { scroll: false });
  };

  const setSubcategory = (sub: string | null) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (sub) params.set("subcategory", sub);
    router.push(`/prodotti?${params}`, { scroll: false });
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (currentSubcategory) params.set("subcategory", currentSubcategory);
    params.set("page", page.toString());
    router.push(`/prodotti?${params}`, { scroll: false });
  };

  /* Get subcategories for current category */
  const subcategories = CATEGORY_SUBCATEGORIES[currentCategory] || CATEGORY_SUBCATEGORIES.TUTTI;

  /* Pagination with ellipsis */
  const getPaginationItems = () => {
    const items: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        items.push(i);
      }
      if (currentPage < totalPages - 2) items.push("...");
      items.push(totalPages);
    }
    return items;
  };

  return (
    <>
      {/* ===== HERO — full screen, title centered ===== */}
      <section className="relative w-full flex items-center justify-center bg-warm-100" style={{ height: "100vh" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-4xl md:text-5xl lg:text-6xl text-warm-800 tracking-wide"
        >
          Prodotti
        </motion.h1>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section className="gtv-container py-14 md:py-20">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-base md:text-lg text-warm-600 leading-relaxed max-w-4xl mx-auto text-center font-light"
          style={{ textAlign: "justify" }}
        >
          I prodotti Gebrüder Thonet Vienna uniscono tradizione e innovazione in forme iconiche e senza
          tempo. Leggerezza visiva, solidità e dettagli artigianali rendono ogni pezzo unico, ideale per spazi
          residenziali e contract. Personalizzabili in finiture e materiali, portano eleganza e carattere in ogni
          ambiente.
        </motion.p>
      </section>

      {/* ===== CATEGORY FILTERS ===== */}
      <div className="gtv-container">
        <div className="flex flex-wrap gap-6 justify-center pb-6">
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`text-sm tracking-[0.08em] pb-1 transition-colors ${
                currentCategory === cat.value
                  ? "text-warm-800 border-b border-warm-800"
                  : "text-warm-400 hover:text-warm-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SUB-CATEGORY FILTERS ===== */}
      <div className="border-t border-b border-warm-200">
        <div className="gtv-container py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center">
            {subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubcategory(currentSubcategory === sub ? null : sub)}
                className={`text-sm uppercase tracking-[0.08em] transition-colors ${
                  currentSubcategory === sub
                    ? "text-warm-800 font-medium border-b border-warm-800 pb-0.5"
                    : "text-warm-500 hover:text-warm-800"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <section className="gtv-container py-12 md:py-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-warm-100" />
                <div className="h-2 bg-warm-100 mt-4 w-16" />
                <div className="h-3 bg-warm-100 mt-2 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              >
                <Link href={`/prodotti/${product.slug}`} className="group block">
                  <div className="relative aspect-square bg-warm-50 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-warm-400 font-normal">
                      {product.subcategory || (product.category === "CLASSICI" ? "Classici" : product.category?.charAt(0) + product.category?.slice(1).toLowerCase())}
                    </p>
                    <h3 className="text-sm font-normal uppercase tracking-[0.08em] text-warm-800 mt-1 group-hover:text-warm-500 transition-colors">
                      {product.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-warm-400 text-sm">Nessun prodotto trovato per questa selezione.</p>
          </div>
        )}

        {/* ===== PAGINATION ===== */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-16">
            {getPaginationItems().map((item, i) =>
              item === "..." ? (
                <span key={`ellipsis-${i}`} className="text-xs text-warm-400 px-1">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-9 h-9 rounded-full text-xs transition-colors border ${
                    currentPage === item
                      ? "border-warm-800 text-warm-800"
                      : "border-transparent text-warm-400 hover:text-warm-700"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/* ===== BREADCRUMBS ===== */}
      <div className="gtv-container pb-12">
        <div className="flex items-center justify-start gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Prodotti</span>
        </div>
      </div>
    </>
  );
}

export default function ProdottiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
