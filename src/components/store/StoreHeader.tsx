"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { ShoppingBag, User, Menu, X, Heart } from "lucide-react";
import { useLang } from "@/contexts/I18nContext";

interface Category {
  id: string;
  parentId: string | null;
  slug: string;
  productCount?: number;
  translations: { languageCode: string; name: string; slug: string }[];
}

const HEADER_TOP_N = 5;

export default function StoreHeader() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = useLang();

  useEffect(() => {
    fetch("/api/store/public/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  const rootCategories = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  const label = (c: Category) =>
    c.translations.find((t) => t.languageCode === lang)?.name ||
    c.translations.find((t) => t.languageCode === "it")?.name ||
    c.slug;

  // Top N root categories per numero di prodotti (decrescente), fallback sortOrder
  const headerCategories = [...rootCategories]
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
    .slice(0, HEADER_TOP_N);

  const activeCategorySlug = searchParams.get("category") || "";

  return (
    <>
      <header
        className="fixed top-0 z-50 bg-white"
        style={{ left: "var(--site-margin)", right: "var(--site-margin)" }}
      >
        <div className="px-4 md:px-6 lg:px-10">
          <div className="flex items-center h-20 md:h-24 gap-4">
            {/* Logo a sinistra */}
            <Link href="/" className="flex items-center shrink-0" aria-label="Gebrüder Thonet Vienna Store">
              <Image src="/logo.webp" alt="Gebrüder Thonet Vienna" width={80} height={65} priority />
            </Link>

            {/* Menu desktop: solo top 5 categorie per n° prodotti */}
            <nav className="hidden md:flex flex-1 justify-center items-center gap-6 lg:gap-10">
              {headerCategories.map((c) => {
                const isActive = activeCategorySlug === c.slug;
                return (
                  <Link
                    key={c.id}
                    href={`/?category=${encodeURIComponent(c.slug)}`}
                    className={`uppercase tracking-[0.25em] text-[11px] py-1 whitespace-nowrap transition-colors ${
                      isActive ? "text-neutral-900 font-medium" : "text-neutral-700 hover:text-neutral-900"
                    }`}
                  >
                    {label(c)}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1 md:hidden" />

            {/* Azioni a destra */}
            <div className="flex items-center gap-2 md:gap-4 text-neutral-700 shrink-0">
              <Link href="/account/favorites" title="Preferiti" className="p-1 hover:text-neutral-900 transition-colors hidden sm:inline-flex">
                <Heart size={20} strokeWidth={1.6} />
              </Link>
              <Link href="/account" title="Area riservata" className="p-1 hover:text-neutral-900 transition-colors">
                <User size={20} strokeWidth={1.6} />
              </Link>
              <Link href="/carrello" title="Carrello" className="p-1 hover:text-neutral-900 transition-colors">
                <ShoppingBag size={20} strokeWidth={1.6} />
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-1 text-neutral-700 ml-1"
                aria-label="Apri menu"
              >
                <Menu size={22} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu mobile overlay — mostra TUTTE le categorie */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col md:hidden">
          <div className="flex items-center justify-between h-20 md:h-24 px-4 md:px-8 border-b border-neutral-100">
            <div className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">Gebrüder Thonet Vienna · Store</div>
            <button onClick={() => setMobileOpen(false)} className="p-2 text-neutral-700 hover:text-neutral-900" aria-label="Chiudi">
              <X size={24} strokeWidth={1.6} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-6 md:px-12 py-10">
            <div className="max-w-3xl space-y-10">
              <div>
                <div className="text-[11px] tracking-[0.3em] text-neutral-500 uppercase mb-4">Collezioni</div>
                {rootCategories.length === 0 ? (
                  <div className="text-neutral-400 italic text-sm">Nessuna categoria pubblicata.</div>
                ) : (
                  <ul className="space-y-4">
                    {rootCategories.map((c) => {
                      const children = childrenOf(c.id);
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/?category=${encodeURIComponent(c.slug)}`}
                            className="block text-2xl md:text-3xl text-neutral-900 hover:text-neutral-600"
                            style={{ fontFamily: "'Libre Caslon Text', serif" }}
                          >
                            {label(c)}
                          </Link>
                          {children.length > 0 && (
                            <ul className="pl-4 mt-2 space-y-1 text-sm">
                              {children.map((child) => (
                                <li key={child.id}>
                                  <Link href={`/?category=${encodeURIComponent(child.slug)}`} className="text-neutral-500 hover:text-neutral-900">
                                    {label(child)}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="pt-8 border-t border-neutral-200 space-y-2 text-sm">
                <Link href="/account" className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Area riservata</Link>
                <Link href="/account/favorites" className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Preferiti</Link>
                <Link href="/carrello" className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Carrello</Link>
                <Link href="https://dev.gebruederthonetvienna.com" className="block text-neutral-500 hover:text-neutral-800 text-xs mt-6">← Torna al sito principale</Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
