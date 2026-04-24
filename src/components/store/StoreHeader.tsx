"use client";

import { useEffect, useRef, useState } from "react";
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

interface MiniProduct {
  id: string;
  slug: string;
  name: string;
  coverImage: string | null;
  priceFromCents: number;
}

type MenuKey = "top-sold" | "top-favorited" | null;

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

export default function StoreHeader() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topSold, setTopSold] = useState<MiniProduct[]>([]);
  const [topFav, setTopFav] = useState<MiniProduct[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = useLang();

  useEffect(() => {
    fetch("/api/store/public/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
    fetch(`/api/store/public/products/top-sold?lang=${lang}&limit=8`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTopSold(d.data); })
      .catch(() => {});
    fetch(`/api/store/public/products/top-favorited?lang=${lang}&limit=8`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTopFav(d.data); })
      .catch(() => {});
  }, [lang]);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenu(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const rootCategories = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  const label = (c: Category) =>
    c.translations.find((t) => t.languageCode === lang)?.name ||
    c.translations.find((t) => t.languageCode === "it")?.name ||
    c.slug;

  const activeCategorySlug = searchParams.get("category") || "";
  const isOnShopHome = pathname === "/" || pathname === "/store";

  const openOnHover = (key: MenuKey) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpenMenu(key);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  return (
    <>
      <div onMouseLeave={scheduleClose}>
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

              {/* Menu desktop centrato: categorie inline + Top venduti + Più piaciuti */}
              <nav className="hidden md:flex flex-1 justify-center items-center gap-5 lg:gap-7">
                {rootCategories.map((c) => {
                  const isActive = isOnShopHome && activeCategorySlug === c.slug;
                  return (
                    <Link
                      key={c.id}
                      href={`/?category=${encodeURIComponent(c.slug)}`}
                      onMouseEnter={() => openOnHover(null)}
                      className={`uppercase tracking-[0.2em] text-[11px] py-1 whitespace-nowrap transition-colors ${
                        isActive ? "text-neutral-900 font-medium" : "text-neutral-700 hover:text-neutral-900"
                      }`}
                    >
                      {label(c)}
                    </Link>
                  );
                })}

                <button
                  onMouseEnter={() => openOnHover("top-sold")}
                  onClick={() => setOpenMenu(openMenu === "top-sold" ? null : "top-sold")}
                  aria-expanded={openMenu === "top-sold"}
                  className={`uppercase tracking-[0.2em] text-[11px] py-1 whitespace-nowrap transition-colors ${
                    openMenu === "top-sold" ? "text-neutral-900 font-medium" : "text-neutral-700 hover:text-neutral-900"
                  }`}
                >
                  Top venduti
                </button>

                <button
                  onMouseEnter={() => openOnHover("top-favorited")}
                  onClick={() => setOpenMenu(openMenu === "top-favorited" ? null : "top-favorited")}
                  aria-expanded={openMenu === "top-favorited"}
                  className={`uppercase tracking-[0.2em] text-[11px] py-1 whitespace-nowrap transition-colors ${
                    openMenu === "top-favorited" ? "text-neutral-900 font-medium" : "text-neutral-700 hover:text-neutral-900"
                  }`}
                >
                  Più piaciuti
                </button>
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

          {/* Mega-menu: solo Top venduti / Più piaciuti */}
          {openMenu && (
            <div
              onMouseEnter={() => openOnHover(openMenu)}
              className="absolute left-0 right-0 top-full bg-white border-t border-neutral-100 shadow-lg"
            >
              <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
                {openMenu === "top-sold" && (
                  <MegaProducts title="I più venduti" items={topSold} emptyText="Ancora nessun ordine registrato." />
                )}
                {openMenu === "top-favorited" && (
                  <MegaProducts title="I più piaciuti dai clienti" items={topFav} emptyText="Ancora nessun preferito registrato." />
                )}
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Menu mobile overlay */}
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

              <div>
                <div className="text-[11px] tracking-[0.3em] text-neutral-500 uppercase mb-4">Scopri</div>
                <ul className="space-y-3 text-lg">
                  <li><Link href="/?sort=top-sold" className="text-neutral-900 hover:text-neutral-600">Top venduti</Link></li>
                  <li><Link href="/?sort=top-favorited" className="text-neutral-900 hover:text-neutral-600">Più piaciuti</Link></li>
                </ul>
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

function MegaProducts({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: MiniProduct[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">{title}</div>
      </div>
      {items.length === 0 ? (
        <div className="text-neutral-400 italic text-sm py-8">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          {items.slice(0, 8).map((p) => (
            <Link key={p.id} href={`/prodotti/${p.slug}`} className="group block">
              <div className="relative aspect-[4/5] bg-warm-100 overflow-hidden">
                {p.coverImage && (
                  <Image
                    src={p.coverImage}
                    alt={p.name}
                    fill
                    sizes="20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-3 space-y-0.5">
                <div className="text-[13px] text-neutral-900 group-hover:text-neutral-600 transition-colors truncate">{p.name}</div>
                {p.priceFromCents > 0 && (
                  <div className="text-[12px] text-neutral-500 font-mono">da {eur(p.priceFromCents)}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
