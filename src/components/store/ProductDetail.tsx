"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Ruler, ShoppingBag, Heart, Maximize2, X as XIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useCart } from "@/contexts/CartContext";

type AttrType = "MATERIAL" | "FINISH" | "COLOR" | "OTHER";

interface Attribute {
  id: string;
  type: AttrType;
  code: string;
  hexColor: string | null;
  label: string;
}

interface Variant {
  id: string;
  sku: string;
  priceCents: number;
  stockQty: number | null;
  trackStock: boolean;
  volumeM3: number;
  weightKg: number | null;
  shippingClass: "STANDARD" | "FRAGILE" | "OVERSIZED" | "QUOTE_ONLY";
  coverImage: string | null;
  galleryImages: string | null;
  isDefault: boolean;
  name: string | null;
  description: string | null;
  dimensions: { blockName: string; labels: string[]; values: Record<string, string> } | null;
  attributes: Attribute[];
}

interface RelatedProject {
  id: string;
  name: string;
  slug: string;
  type: string;
  country: string;
  city: string | null;
  year: number | null;
  imageUrl: string;
}

interface RelatedProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  coverImage: string | null;
  hoverImage: string | null;
  priceFromCents: number;
  variantsCount: number;
  inStock: boolean;
  category: { slug: string; name: string } | null;
  colors: { id: string; code: string; hex: string | null }[];
}

interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  marketingDescription: string | null;
  coverImage: string | null;
  galleryImages: string | null;
  excludedCatalogImages: string | null;
  catalogGalleryImages: string | null;
  materials: string | null;
  dimensions: string | null;
  category: { slug: string; name: string } | null;
  designer: { name: string; slug: string; bio: string | null; country: string | null; imageUrl: string | null } | null;
  variants: Variant[];
  relatedProjects: RelatedProject[];
}

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string");
  } catch { /* fall-through */ }
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inP = false;
  const closeP = () => { if (inP) { out.push("</p>"); inP = false; } };
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeP(); closeList(); continue; }
    if (/^### /.test(line)) { closeP(); closeList(); out.push(`<h3>${inline(line.replace(/^### /, ""))}</h3>`); continue; }
    if (/^## /.test(line))  { closeP(); closeList(); out.push(`<h2>${inline(line.replace(/^## /, ""))}</h2>`); continue; }
    if (/^# /.test(line))   { closeP(); closeList(); out.push(`<h1>${inline(line.replace(/^# /, ""))}</h1>`); continue; }
    if (/^> /.test(line))   { closeP(); closeList(); out.push(`<blockquote>${inline(line.replace(/^> /, ""))}</blockquote>`); continue; }
    if (/^[-*] /.test(line)) {
      closeP();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*] /, ""))}</li>`);
      continue;
    }
    closeList();
    if (!inP) { out.push("<p>"); inP = true; } else { out.push("<br/>"); }
    out.push(inline(line));
  }
  closeP(); closeList();
  return out.join("\n");

  function inline(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }
}

const RELATED_PAGE_SIZE = 4;

export default function ProductDetail({ product }: { product: Product }) {
  const { customer } = useCustomerAuth();
  const { addItem, count: cartCount } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants.find((v) => v.isDefault)?.id ?? product.variants[0]?.id ?? ""
  );
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) || product.variants[0],
    [product.variants, selectedVariantId]
  );

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    const attrLabels = selectedVariant.attributes.map((a) => a.label).join(" · ");
    addItem({
      variantId: selectedVariant.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: selectedVariant.name,
      variantAttributes: attrLabels,
      sku: selectedVariant.sku,
      priceCents: selectedVariant.priceCents,
      coverImage: selectedVariant.coverImage || product.coverImage,
      volumeM3: selectedVariant.volumeM3,
      weightKg: selectedVariant.weightKg,
      shippingClass: selectedVariant.shippingClass,
    }, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  useEffect(() => {
    if (!customer) { setIsFav(false); return; }
    fetch("/api/store/public/favorites?lang=it", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setIsFav((d.data as { storeProductId: string }[]).some((f) => f.storeProductId === product.id));
      })
      .catch(() => {});
  }, [customer, product.id]);

  async function toggleFavorite() {
    if (!customer) { window.location.href = "/account"; return; }
    if (favBusy) return;
    setFavBusy(true);
    try {
      if (isFav) {
        await fetch(`/api/store/public/favorites?storeProductId=${product.id}`, { method: "DELETE" });
        setIsFav(false);
      } else {
        await fetch("/api/store/public/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeProductId: product.id }),
        });
        setIsFav(true);
      }
    } finally { setFavBusy(false); }
  }

  const attrByType = useMemo(() => {
    const map: Record<AttrType, Attribute[]> = { MATERIAL: [], FINISH: [], COLOR: [], OTHER: [] };
    const seen = new Set<string>();
    for (const v of product.variants) {
      for (const a of v.attributes) {
        if (!seen.has(a.id)) { seen.add(a.id); map[a.type].push(a); }
      }
    }
    return map;
  }, [product.variants]);

  const hasAttributeVariants = useMemo(
    () => Object.values(attrByType).some((arr) => arr.length > 0),
    [attrByType]
  );

  const selectAttr = (type: AttrType, attrId: string) => {
    const current = selectedVariant;
    if (!current) return;
    const otherAttrs = current.attributes.filter((a) => a.type !== type).map((a) => a.id);
    const match = product.variants.find((v) =>
      v.attributes.some((a) => a.id === attrId) &&
      otherAttrs.every((oid) => v.attributes.some((a) => a.id === oid))
    );
    if (match) { setSelectedVariantId(match.id); return; }
    const fallback = product.variants.find((v) => v.attributes.some((a) => a.id === attrId));
    if (fallback) setSelectedVariantId(fallback.id);
  };

  const selectedAttrIds = new Set(selectedVariant?.attributes.map((a) => a.id));

  const heroImages = useMemo(() => {
    const imgs: string[] = [];
    if (selectedVariant?.coverImage) imgs.push(selectedVariant.coverImage);
    imgs.push(...parseList(selectedVariant?.galleryImages || null));
    if (product.coverImage && !imgs.includes(product.coverImage)) imgs.push(product.coverImage);
    imgs.push(...parseList(product.galleryImages).filter((u) => !imgs.includes(u)));
    return imgs;
  }, [product, selectedVariant]);

  // Catalog gallery — usa esattamente la galleria del prodotto del sito normale
  // (Product.galleryImages), togliendo solo quelle escluse dal CMS store.
  // NON filtriamo per heroImages: l'utente vuole vedere tutte le foto del catalogo
  // anche se alcune sono già nel hero (sono in posizioni diverse della pagina).
  const catalogGallery = useMemo(() => {
    const all = parseList(product.catalogGalleryImages);
    const excluded = new Set(parseList(product.excludedCatalogImages));
    return all.filter((u) => !excluded.has(u));
  }, [product.catalogGalleryImages, product.excludedCatalogImages]);

  useEffect(() => { setActiveImgIdx(0); }, [selectedVariantId]);

  const inStock = selectedVariant
    ? !selectedVariant.trackStock || (selectedVariant.stockQty ?? 0) > 0
    : false;

  // ─── Lightbox keyboard navigation ───
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setActiveImgIdx((i) => (i + 1) % heroImages.length);
      if (e.key === "ArrowLeft") setActiveImgIdx((i) => (i - 1 + heroImages.length) % heroImages.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, heroImages.length]);

  // ─── Magnifier ───
  const heroRef = useRef<HTMLDivElement | null>(null);
  const onHeroMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);
  const onHeroMouseLeave = useCallback(() => setHoverPos(null), []);

  // ─── Related products fetch ───
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedShown, setRelatedShown] = useState(RELATED_PAGE_SIZE);

  useEffect(() => {
    const params = new URLSearchParams({ lang: "it" });
    if (product.category?.slug) params.set("category", product.category.slug);
    fetch(`/api/store/public/products?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const filtered = (d.data as RelatedProduct[]).filter((p) => p.id !== product.id);
          setRelated(filtered);
        }
      })
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [product.id, product.category?.slug]);

  return (
    <>
      {/* ═══ Top: galleria + info ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          <div
            ref={heroRef}
            className="aspect-square bg-warm-100 relative overflow-hidden cursor-zoom-in group"
            onMouseMove={onHeroMouseMove}
            onMouseLeave={onHeroMouseLeave}
            onClick={() => setLightboxOpen(true)}
          >
            {heroImages[activeImgIdx] ? (
              <Image
                src={heroImages[activeImgIdx]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition-transform duration-200 ease-out"
                style={hoverPos ? { transform: "scale(1.6)", transformOrigin: `${hoverPos.x}% ${hoverPos.y}%` } : undefined}
              />
            ) : null}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-warm-900 shadow opacity-90 group-hover:opacity-100 hover:bg-white transition-all z-10"
              aria-label="Apri immagine a tutto schermo"
            >
              <Maximize2 size={16} />
            </button>
          </div>
          {heroImages.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {heroImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIdx(i)}
                  className={`aspect-square overflow-hidden relative border-2 ${i === activeImgIdx ? "border-warm-900" : "border-transparent hover:border-warm-300"}`}
                  aria-label={`Immagine ${i + 1}`}
                >
                  <Image src={img} alt="" fill sizes="100px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-warm-900 tracking-[-0.005em]">
            {product.name}
          </h1>
          {product.designer && (
            <div className="mt-2 text-[13px] text-warm-500 tracking-[0.06em]">
              design <Link href={`/designers/${product.designer.slug}`} className="text-warm-800 hover:underline underline-offset-2">{product.designer.name}</Link>
            </div>
          )}

          {product.shortDescription && (
            <p className="mt-5 text-[15px] text-warm-700 leading-[1.6]">{product.shortDescription}</p>
          )}

          {/* Variant selector */}
          {hasAttributeVariants ? (
            <div className="mt-7 space-y-5 pt-6 border-t border-warm-200">
              {(["MATERIAL", "FINISH", "COLOR"] as AttrType[]).map((type) => {
                const available = attrByType[type];
                if (available.length === 0) return null;
                const current = selectedVariant?.attributes.find((a) => a.type === type);
                return (
                  <div key={type}>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-warm-500 mb-2.5">
                      {type === "MATERIAL" ? "Materiale" : type === "FINISH" ? "Finitura" : "Colore"}
                      {current && <span className="ml-2 text-warm-900 normal-case tracking-normal text-[12px]">· {current.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {available.map((a) => {
                        const isSel = selectedAttrIds.has(a.id);
                        if (type === "COLOR") {
                          return (
                            <button key={a.id} onClick={() => selectAttr(type, a.id)} title={a.label}
                              className={`w-9 h-9 rounded-full border-2 transition-all ${isSel ? "border-warm-900 scale-110" : "border-warm-200 hover:border-warm-400"}`}
                              style={{ backgroundColor: a.hexColor || "#ccc" }} />
                          );
                        }
                        return (
                          <button key={a.id} onClick={() => selectAttr(type, a.id)}
                            className={`px-3 py-1.5 text-[12px] tracking-[0.04em] border transition-colors ${isSel ? "border-warm-900 bg-warm-900 text-white" : "border-warm-200 text-warm-700 hover:border-warm-500"}`}>
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : product.variants.length > 1 ? (
            <div className="mt-7 pt-6 border-t border-warm-200">
              <div className="text-[10px] uppercase tracking-[0.22em] text-warm-500 mb-2.5">Variante</div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVariantId(v.id)}
                    className={`px-4 py-2 text-[12px] tracking-[0.04em] border transition-colors ${v.id === selectedVariantId ? "border-warm-900 bg-warm-900 text-white" : "border-warm-200 text-warm-700 hover:border-warm-500"}`}>
                    {v.name || v.sku}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Price + CTA */}
          <div className="mt-7 pt-6 border-t border-warm-200">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-[34px] font-light text-warm-900 tracking-tight">
                {selectedVariant ? eur(selectedVariant.priceCents) : "—"}
              </div>
              {selectedVariant && (
                <div className="text-[10px] text-warm-500 font-mono tracking-wide">SKU {selectedVariant.sku}</div>
              )}
            </div>
            <div className="text-[11px] text-warm-500 mb-4">IVA inclusa · spedizione calcolata al checkout</div>

            <div className="flex items-center gap-1.5 mb-4 text-[12px]">
              {inStock ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Disponibile
                  {selectedVariant?.trackStock && <span className="text-warm-500 ml-1">({selectedVariant.stockQty} pz)</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Non disponibile
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                disabled={!inStock}
                onClick={handleAddToCart}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 text-white uppercase text-[12px] tracking-[0.18em] disabled:bg-warm-300 disabled:cursor-not-allowed transition-colors ${justAdded ? "bg-emerald-600 hover:bg-emerald-700" : "bg-warm-900 hover:bg-warm-800"}`}
              >
                <ShoppingBag size={15} /> {justAdded ? "Aggiunto" : "Aggiungi al carrello"}
              </button>
              <button
                onClick={toggleFavorite}
                disabled={favBusy}
                title={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                className={`w-12 border flex items-center justify-center transition-colors ${isFav ? "border-red-500 text-red-500 bg-red-50" : "border-warm-300 text-warm-700 hover:border-warm-900 hover:text-warm-900"}`}
                aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              >
                <Heart size={17} fill={isFav ? "currentColor" : "none"} strokeWidth={1.6} />
              </button>
            </div>
            {cartCount > 0 && (
              <div className="mt-3 text-[11px] text-warm-700 text-center">
                <a href="/carrello" className="underline hover:text-warm-900">Vai al carrello ({cartCount})</a>
              </div>
            )}
          </div>

          {/* ── Specs (volume / peso / spedizione) — più leggibili ── */}
          {selectedVariant && (
            <div className="mt-7 pt-6 border-t border-warm-200 grid grid-cols-3 gap-x-4 gap-y-3">
              <BigSpec icon={<Package size={14} />} label="Volume" value={`${selectedVariant.volumeM3.toFixed(3)} m³`} />
              {selectedVariant.weightKg !== null && (
                <BigSpec label="Peso" value={`${selectedVariant.weightKg.toFixed(1)} kg`} />
              )}
              <BigSpec icon={<Ruler size={14} />} label="Spedizione" value={selectedVariant.shippingClass === "QUOTE_ONLY" ? "Su preventivo" : "Standard"} />
            </div>
          )}

          {/* Variant dimensions */}
          {selectedVariant?.dimensions && Object.keys(selectedVariant.dimensions.values).length > 0 && (
            <div className="mt-6 pt-6 border-t border-warm-200">
              <div className="text-[12px] uppercase tracking-[0.22em] text-warm-500 mb-3 inline-flex items-center gap-1.5">
                <Ruler size={12} /> Dimensioni
                <span className="normal-case tracking-normal text-warm-400 ml-1 text-[12px]">· {selectedVariant.dimensions.blockName}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-[14px]">
                {selectedVariant.dimensions.labels.filter((l) => selectedVariant.dimensions!.values[l]).map((l) => (
                  <div key={l}>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-warm-500 mb-0.5">{l}</div>
                    <div className="text-warm-900 font-mono text-[15px]">{selectedVariant.dimensions!.values[l]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog materials/dimensions if no variant dimensions */}
          {(!selectedVariant?.dimensions || Object.keys(selectedVariant.dimensions.values).length === 0) && (product.materials || product.dimensions) && (
            <div className="mt-6 pt-6 border-t border-warm-200 space-y-5">
              {product.materials && (
                <div>
                  <div className="text-[12px] uppercase tracking-[0.22em] text-warm-500 mb-2">Materiali</div>
                  <p className="text-[15px] text-warm-700 leading-[1.55]">{product.materials}</p>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <div className="text-[12px] uppercase tracking-[0.22em] text-warm-500 mb-2">Dimensioni</div>
                  <p className="font-mono text-[15px] text-warm-900">{product.dimensions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Sezione Descrizione (2-col: testo + galleria a cascata) ═══ */}
      {(product.marketingDescription || catalogGallery.length > 0) && (
        <section className="mt-20 pt-14 border-t border-warm-200">
          <div className="text-[10px] uppercase tracking-[0.28em] text-warm-500 mb-8">Descrizione</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">
            <div className={`text-[15px] text-warm-700 leading-[1.75] max-w-[640px]
              [&_h1]:font-serif [&_h1]:text-[30px] [&_h1]:text-warm-900 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-[-0.005em]
              [&_h2]:font-serif [&_h2]:text-[26px] [&_h2]:text-warm-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:tracking-[-0.005em]
              [&_h3]:font-serif [&_h3]:text-[19px] [&_h3]:text-warm-900 [&_h3]:mt-6 [&_h3]:mb-3
              [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1.5
              [&_blockquote]:border-l-2 [&_blockquote]:border-warm-300 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-warm-600 [&_blockquote]:my-6
              [&_strong]:font-semibold [&_strong]:text-warm-900`.replace(/\s+/g, " ")}>
              {product.marketingDescription
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(product.marketingDescription) }} />
                : <p className="text-warm-500 italic">Descrizione in arrivo.</p>}
            </div>
            {/* Galleria "a cascata" — usa le immagini del catalogo prodotto del sito normale */}
            {catalogGallery.length > 0 && (
              <div className="space-y-4 lg:space-y-5">
                {catalogGallery.map((img, i) => (
                  <div key={i} className={`relative bg-warm-100 overflow-hidden ${
                    i % 3 === 0 ? "aspect-[4/5]" : i % 3 === 1 ? "aspect-[4/3]" : "aspect-square"
                  }`}>
                    <Image src={img} alt={`${product.name} — ${i + 1}`} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ Sezione Designer — stile sito (sfondo grigiastro, foto sx + info dx) ═══ */}
      {product.designer && (product.designer.bio || product.designer.imageUrl) && (
        <section className="mt-20 -mx-4 lg:-mx-8" style={{ backgroundColor: "#f9f8f6" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
            <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
              {product.designer.imageUrl ? (
                <Image
                  src={product.designer.imageUrl}
                  alt={product.designer.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-warm-400 text-sm">
                  (Foto designer non disponibile)
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center px-5 sm:px-8 md:px-16 lg:px-[80px] xl:px-[120px] py-16 lg:py-24">
              <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light">Designer</p>
              <h2 className="font-sans text-[28px] md:text-[34px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-2">
                {product.designer.name}
              </h2>
              {product.designer.country && (
                <p className="text-[14px] text-warm-500 mt-1">{product.designer.country}</p>
              )}
              {product.designer.bio && (
                <div
                  className="text-[18px] md:text-[20px] text-black leading-snug font-light tracking-normal max-w-none mt-6 [&_p]:m-0 [&_p+p]:mt-4"
                  dangerouslySetInnerHTML={{
                    __html: product.designer.bio.includes("<") ? product.designer.bio : `<p>${product.designer.bio.replace(/\n+/g, "</p><p>")}</p>`,
                  }}
                />
              )}
              <Link
                href={`/designers/${product.designer.slug}`}
                target="_blank"
                className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-warm-900 font-medium hover:underline self-start"
                style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
              >
                Scopri tutti i suoi progetti
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Sezione Progetti — stile sito /progetti (4-col, aspect 4:5) ═══ */}
      {product.relatedProjects && product.relatedProjects.length > 0 && (
        <section className="mt-20 pt-14 border-t border-warm-200">
          <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-2">In questi progetti</p>
          <h2 className="font-sans text-[28px] md:text-[34px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-12">
            {product.name} nel mondo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-4 md:gap-y-16">
            {product.relatedProjects.map((p) => (
              <Link key={p.id} href={`/progetti/${p.slug}`} target="_blank" className="group block">
                <div className="relative bg-warm-50 overflow-hidden" style={{ aspectRatio: "4/5" }}>
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
                <div className="mt-4">
                  <p className="uppercase text-[14px] tracking-[0.01em] text-black font-light">
                    {p.type}
                    {p.year && <> · {p.year}</>}
                  </p>
                  <h3 className="font-sans text-[24px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                    {p.name}
                  </h3>
                  {(p.city || p.country) && (
                    <div className="mt-1 text-[12px] text-warm-500">
                      {[p.city, p.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Sezione Prodotti correlati ═══ */}
      {(relatedLoading || related.length > 0) && (
        <section className="mt-20 pt-14 border-t border-warm-200">
          <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-2">Prodotti correlati</p>
          <h2 className="font-sans text-[28px] md:text-[34px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-12">
            {product.category?.name ? `Altro da ${product.category.name}` : "Altri prodotti dello shop"}
          </h2>
          {relatedLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-warm-100" style={{ aspectRatio: "4/5" }} />
                  <div className="h-3 bg-warm-100 mt-4 w-20" />
                  <div className="h-4 bg-warm-100 mt-2 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-4 md:gap-y-16">
                {related.slice(0, relatedShown).map((p) => (
                  <Link key={p.id} href={`/prodotti/${p.slug}`} className="group block">
                    <div className="relative bg-warm-50 overflow-hidden" style={{ aspectRatio: "4/5" }}>
                      {p.coverImage && (
                        <Image src={p.coverImage} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-opacity duration-500 group-hover:opacity-0" />
                      )}
                      {p.hoverImage && (
                        <Image src={p.hoverImage} alt="" fill sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 scale-[1.02]" />
                      )}
                      {!p.inStock && (
                        <div className="absolute top-3 left-3 bg-warm-900 text-white text-[10px] uppercase tracking-wider px-2 py-1">
                          Esaurito
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      {p.category && (
                        <p className="uppercase text-[14px] tracking-[0.01em] text-black font-light">
                          {p.category.name}
                        </p>
                      )}
                      <div className="flex items-baseline justify-between gap-3 mt-1">
                        <h3 className="font-sans text-[20px] text-black leading-[1.15] font-light uppercase tracking-[inherit] truncate">
                          {p.name}
                        </h3>
                        <div className="text-[14px] font-mono text-warm-900 shrink-0 whitespace-nowrap">
                          {p.variantsCount > 1 ? "da " : ""}{eur(p.priceFromCents)}
                        </div>
                      </div>
                      {p.colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {p.colors.slice(0, 5).map((c) => (
                            <span key={c.id} title={c.code}
                              className="w-3 h-3 rounded-full border border-warm-200"
                              style={{ backgroundColor: c.hex || "#ddd" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {related.length > relatedShown && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setRelatedShown((n) => n + RELATED_PAGE_SIZE)}
                    className="px-8 py-3 border border-warm-900 text-warm-900 uppercase text-[12px] tracking-[0.18em] hover:bg-warm-900 hover:text-white transition-colors"
                  >
                    Carica altri ({related.length - relatedShown})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ═══ Lightbox modal ═══ */}
      {lightboxOpen && heroImages.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" aria-label="Chiudi">
            <XIcon size={22} />
          </button>
          {heroImages.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setActiveImgIdx((i) => (i - 1 + heroImages.length) % heroImages.length); }}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" aria-label="Precedente">
                <ChevronLeft size={22} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setActiveImgIdx((i) => (i + 1) % heroImages.length); }}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" aria-label="Successiva">
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div className="relative w-[92vw] h-[88vh] max-w-7xl" onClick={(e) => e.stopPropagation()}>
            <Image src={heroImages[activeImgIdx]} alt={product.name} fill sizes="92vw" className="object-contain" priority />
          </div>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-[12px] tracking-wider">
            {activeImgIdx + 1} / {heroImages.length}
          </div>
        </div>
      )}
    </>
  );
}

function BigSpec({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-warm-500 mb-1.5 inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="text-warm-900 font-mono text-[15px]">{value}</div>
    </div>
  );
}
