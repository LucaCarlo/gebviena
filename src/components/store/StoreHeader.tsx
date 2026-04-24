"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, X } from "lucide-react";

interface Category {
  id: string;
  parentId: string | null;
  slug: string;
  translations: { languageCode: string; name: string; slug: string }[];
}

export default function StoreHeader() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/store/public/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  const rootCategories = categories.filter((c) => !c.parentId);
  const label = (c: Category) =>
    c.translations.find((t) => t.languageCode === "it")?.name || c.slug;

  return (
    <>
      <header
        className="fixed top-0 z-50 bg-white border-b border-neutral-100"
        style={{ left: "var(--site-margin)", right: "var(--site-margin)" }}
      >
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Hamburger left */}
            <button
              onClick={() => setMobileOpen(true)}
              className="-ml-0.5 p-1 text-neutral-700"
              aria-label="Apri menu"
            >
              <div className="flex flex-col justify-between" style={{ width: "27px", height: "19px" }}>
                <span className="block w-full bg-current" style={{ height: "3px" }} />
                <span className="block w-full bg-current" style={{ height: "3px" }} />
                <span className="block w-full bg-current" style={{ height: "3px" }} />
              </div>
            </button>

            {/* Logo centered (same dimensions as site header) */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href="/" className="flex flex-col items-center">
                <Image
                  src="/logo.webp"
                  alt="Gebrüder Thonet Vienna"
                  width={97}
                  height={79}
                  style={{ marginTop: "-2px" }}
                  priority
                />
                <span className="text-[9px] tracking-[0.3em] text-neutral-500 mt-0.5 uppercase">Store</span>
              </Link>
            </div>

            {/* Right: account + carrello */}
            <div className="flex items-center gap-3 md:gap-5 text-neutral-700">
              <Link href="/account" title="Area riservata" className="p-1 hover:text-neutral-900 transition-colors">
                <User size={22} strokeWidth={1.6} />
              </Link>
              <Link href="/carrello" title="Carrello" className="p-1 hover:text-neutral-900 transition-colors">
                <ShoppingBag size={22} strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Menu overlay — stile full-screen coerente con il sito */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
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
              {rootCategories.length === 0 ? (
                <div className="text-neutral-400 text-sm italic">Nessuna categoria pubblicata.</div>
              ) : (
                <ul className="space-y-4 md:space-y-6">
                  {rootCategories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/?categoryId=${c.id}`}
                        onClick={() => setMobileOpen(false)}
                        className="block text-2xl md:text-4xl text-neutral-900 hover:text-neutral-600 transition-colors"
                        style={{ fontFamily: "'Libre Caslon Text', serif" }}
                      >
                        {label(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-14 pt-8 border-t border-neutral-200 space-y-3 text-sm">
                <Link href="/" onClick={() => setMobileOpen(false)} className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Tutti i prodotti</Link>
                <Link href="/account" onClick={() => setMobileOpen(false)} className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Area riservata</Link>
                <Link href="/carrello" onClick={() => setMobileOpen(false)} className="block text-neutral-700 hover:text-neutral-900 uppercase tracking-wider">Carrello</Link>
                <Link href="https://dev.gebruederthonetvienna.com" className="block text-neutral-500 hover:text-neutral-800 text-xs mt-6">← Torna al sito principale</Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
