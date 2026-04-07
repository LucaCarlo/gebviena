"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface SearchResult {
  type: string;
  typeLabel: string;
  name: string;
  url: string;
  image: string | null;
  subtitle: string | null;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  // Debounced search on typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleResultClick = () => {
    onClose();
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const groupOrder = ["product", "project", "designer", "campaign", "award"];
  const groupLabels: Record<string, string> = {
    product: "Prodotti",
    project: "Progetti",
    designer: "Designer",
    campaign: "Campagne",
    award: "Premi",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — transparent, just for click-to-close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60]"
            onClick={onClose}
          />

          {/* Panel from right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[70] bg-white flex flex-col"
            style={{ width: "34vw", minWidth: "340px", maxWidth: "520px" }}
          >
            {/* Close button */}
            <div className="flex justify-end px-8 pt-6 pb-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="p-1 text-black hover:opacity-60 transition-opacity"
                aria-label="Chiudi ricerca"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            {/* Search input */}
            <div className="px-8 md:px-10 pt-16 pb-6 flex-shrink-0">
              <p className="text-sm font-light mb-2 text-black">
                Che cosa stai cercando?
              </p>

              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Scrivi qui la tua chiave di ricerca"
                    className="w-full border border-neutral-300 bg-transparent px-4 py-4 pr-10 text-sm placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                    style={{ color: "#000" }}
                    autoFocus
                  />
                  {loading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-neutral-400" />
                    </div>
                  ) : query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-8 text-sm font-medium tracking-[0.1em] text-black hover:underline transition-colors"
                  style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
                >
                  Avvia la ricerca
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-8 md:px-10 pb-8">
              {searched && results.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-500">Nessun risultato trovato per</p>
                  <p className="text-sm font-medium text-black mt-1">&ldquo;{query}&rdquo;</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-6">
                  {groupOrder.map((type) => {
                    const items = grouped[type];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-3">
                          {groupLabels[type]} ({items.length})
                        </p>
                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <Link
                              key={`${type}-${i}`}
                              href={item.url}
                              onClick={handleResultClick}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
                            >
                              {/* Image thumbnail */}
                              <div className="w-12 h-12 rounded bg-neutral-100 overflow-hidden flex-shrink-0">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
                                    —
                                  </div>
                                )}
                              </div>

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-black truncate">{item.name}</p>
                                {item.subtitle && (
                                  <p className="text-xs text-neutral-500 truncate mt-0.5">{item.subtitle}</p>
                                )}
                              </div>

                              {/* Arrow */}
                              <ArrowRight size={14} className="text-neutral-300 group-hover:text-black flex-shrink-0 transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
