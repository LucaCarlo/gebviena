"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { NewsArticle } from "@/types";

const ITEMS_PER_PAGE = 24;

interface CategoryItem {
  value: string;
  label: string;
  id: string;
}

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get("category") || "TUTTI";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetch("/api/categories?contentType=news")
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []));
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    params.set("page", currentPage.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());

    const res = await fetch(`/api/news?${params}`);
    const data = await res.json();
    setArticles(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentCategory, currentPage]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== "TUTTI") params.set("category", cat);
    router.push(`/news-e-rassegna-stampa?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.py-8")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    params.set("page", page.toString());
    router.push(`/news-e-rassegna-stampa?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.py-8")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

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
      {/* ===== TITLE ===== */}
      <section className="gtv-container pt-16 pb-28">
        <h1 className="font-serif text-[58px] text-black tracking-tight text-center font-light">
          News &amp; Rassegna Stampa
        </h1>
      </section>

      {/* ===== CATEGORIES FILTER — pill style come prodotti ===== */}
      <div className="gtv-container">
        {categories.length > 0 && (
          <div className="pb-2">
            <div className="flex flex-wrap gap-x-5 gap-y-5 justify-center">
              <button
                onClick={() => setCategory("TUTTI")}
                className={`px-2.5 py-1 rounded-full text-[16px] font-light uppercase tracking-[0.01em] transition-all ${
                  currentCategory === "TUTTI"
                    ? "bg-dark text-white"
                    : "bg-warm-100 text-dark hover:bg-warm-200"
                }`}
              >
                Tutti
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(currentCategory === cat.value ? "TUTTI" : cat.value)}
                  className={`px-2.5 py-1 rounded-full text-[16px] font-light uppercase tracking-[0.01em] transition-all ${
                    currentCategory === cat.value
                      ? "bg-dark text-white"
                      : "bg-warm-100 text-dark hover:bg-warm-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== NEWS GRID — stesso layout prodotti ===== */}
      <section className="py-8 md:py-10">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-warm-100" style={{ aspectRatio: "4/5" }} />
                <div className="h-2 bg-warm-100 mt-4 w-16" />
                <div className="h-3 bg-warm-100 mt-2 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
            {articles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              >
                <Link href={`/news-e-rassegna-stampa/${article.slug}`} className="group block">
                  <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5" }}>
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover mix-blend-multiply"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-4">
                    {article.category && (
                      <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                        {article.category}
                      </p>
                    )}
                    <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                      {article.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-warm-400 text-sm">Nessun articolo trovato per questa selezione.</p>
          </div>
        )}

        {/* ===== PAGINATION ===== */}
        {totalPages >= 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-16">
            {getPaginationItems().map((item, i) =>
              item === "..." ? (
                <span key={`ellipsis-${i}`} className="text-sm text-warm-400 px-1">&hellip;</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-8 h-8 rounded-full text-sm transition-colors ${
                    currentPage === item
                      ? "bg-warm-100 text-dark border border-dark"
                      : "bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700"
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
      <div className="gtv-container pb-2 -mt-10">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <ChevronRight size={12} />
          <span>News &amp; Rassegna Stampa</span>
        </div>
      </div>
    </>
  );
}

export default function NewsRassegnaStampaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <NewsContent />
    </Suspense>
  );
}
