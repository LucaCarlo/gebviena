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
  translations: { languageCode: string; name: string; slug: string }[];
}

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
  const label = (c: Category) =>
    c.translations.find((t) => t.languageCode === lang)?.name ||
    c.translations.find((t) => t.languageCode === "it")?.name ||
    c.slug;

  const activeCategoryId = searchParams.get("categoryId") || "";
  const isOnShopHome = pathname === "/" || pathname === "/store";

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
              <Image
                src="/logo.webp"
                alt="Gebrüder Thonet Vienna"
                width={80}
                height={65}
                priority
              />
            </Link>

            {/* Menu categorie centrato (desktop) */}
            <nav className="hidden lg:flex flex-1 justify-center items-center gap-8 text-sm">
              <Link
                href="/"
                className={`uppercase tracking-[0.15em] text-[11px] transition-colors ${
                  isOnShopHome && !activeCategoryId ? "text-neutral-900 font-medium" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Tutti
              </Link>
              {rootCategories.map((c) => {
                const isActive = isOnShopHome && activeCategoryId === c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/?categoryId=${c.id}`}
                    className={`uppercase tracking-[0.15em] text-[11px] transition-colors ${
                      isActive ? "text-neutral-900 font-medium" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {label(c)}
                  </Link>
                );
              })}
            </nav>

            {/* Spaziatore per mobile/tablet (senza il nav) */}
            <div className="flex-1 lg:hidden" />

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
              {/* Hamburger mobile/tablet */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1 text-neutral-700 ml-1"
                aria-label="Apri menu"
              >
                <Menu size={22} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col lg:hidden">
          <div className="flex items-center justify-between h-20 md:h-24 px-4 md:px-8 border-b border-neutral-100">
            <div className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">Gebrüder Thonet Vienna · Store</div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 text-neutral-700 hover:text-neutral-900"
              aria-label="Chiudi"
            >
              <X size={24} strokeWidth={1.6} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-6 md:px-12 py-10">
            <div className="max-w-3xl">
              <div className="text-[11px] tracking-[0.3em] text-neutral-500 uppercase mb-6">Collezioni</div>
              <ul className="space-y-4 md:space-y-6">
                <li>
                  <Link
                    href="/"
                    className="block text-2xl md:text-4xl text-neutral-900 hover:text-neutral-600 transition-colors"
                    style={{ fontFamily: "'Libre Caslon Text', serif" }}
                  >
                    Tutti i prodotti
                  </Link>
                </li>
                {rootCategories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/?categoryId=${c.id}`}
                      className="block text-2xl md:text-4xl text-neutral-900 hover:text-neutral-600 transition-colors"
                      style={{ fontFamily: "'Libre Caslon Text', serif" }}
                    >
                      {label(c)}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-14 pt-8 border-t border-neutral-200 space-y-3 text-sm">
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
