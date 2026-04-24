"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Menu, X } from "lucide-react";

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
      .then((data) => {
        if (data.success) setCategories(data.data);
      })
      .catch(() => {});
  }, []);

  // Solo categorie root (parentId null) per il menu top
  const rootCategories = categories.filter((c) => !c.parentId);

  const label = (c: Category) =>
    c.translations.find((t) => t.languageCode === "it")?.name || c.slug;

  return (
    <header className="border-b border-warm-200 sticky top-0 bg-white z-40">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.webp" alt="GTV Store" width={48} height={40} priority />
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-[10px] tracking-[0.2em] text-warm-500 uppercase">Gebrüder Thonet Vienna</span>
              <span className="text-sm font-semibold tracking-wider">STORE</span>
            </div>
          </Link>

          {/* Menu desktop */}
          <nav className="hidden lg:flex items-center gap-6">
            {rootCategories.map((c) => (
              <Link
                key={c.id}
                href={`/?categoryId=${c.id}`}
                className="text-sm text-warm-700 hover:text-warm-900 uppercase tracking-wider transition-colors"
              >
                {label(c)}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link href="/account" title="Area riservata" className="p-2 text-warm-600 hover:text-warm-900">
              <User size={20} />
            </Link>
            <Link href="/carrello" title="Carrello" className="p-2 text-warm-600 hover:text-warm-900 relative">
              <ShoppingBag size={20} />
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-warm-600 hover:text-warm-900"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col lg:hidden">
          <div className="h-20 border-b border-warm-200 flex items-center justify-between px-4">
            <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
              <Image src="/logo.webp" alt="GTV" width={40} height={33} />
              <span className="text-sm font-semibold tracking-wider">STORE</span>
            </Link>
            <button onClick={() => setMobileOpen(false)} className="p-2">
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {rootCategories.map((c) => (
              <Link
                key={c.id}
                href={`/?categoryId=${c.id}`}
                onClick={() => setMobileOpen(false)}
                className="text-lg text-warm-800 uppercase tracking-wider py-2 border-b border-warm-100"
              >
                {label(c)}
              </Link>
            ))}
            <div className="mt-8 flex gap-2">
              <Link href="/account" onClick={() => setMobileOpen(false)} className="flex-1 inline-flex items-center justify-center gap-2 py-3 border border-warm-300 text-warm-800 uppercase text-sm tracking-wider">
                <User size={16} /> Area riservata
              </Link>
              <Link href="/carrello" onClick={() => setMobileOpen(false)} className="flex-1 inline-flex items-center justify-center gap-2 py-3 border border-warm-300 text-warm-800 uppercase text-sm tracking-wider">
                <ShoppingBag size={16} /> Carrello
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
