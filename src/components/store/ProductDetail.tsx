"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Package, Ruler, ShoppingBag, Info } from "lucide-react";

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
  attributes: Attribute[];
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
  category: { slug: string; name: string } | null;
  designer: { name: string; slug: string } | null;
  variants: Variant[];
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

export default function ProductDetail({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants.find((v) => v.isDefault)?.id ?? product.variants[0]?.id ?? ""
  );

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) || product.variants[0],
    [product.variants, selectedVariantId]
  );

  // Raggruppa gli attributi disponibili per tipo (per far scegliere all'utente)
  const attrByType = useMemo(() => {
    const map: Record<AttrType, Attribute[]> = { MATERIAL: [], FINISH: [], COLOR: [], OTHER: [] };
    const seen = new Set<string>();
    for (const v of product.variants) {
      for (const a of v.attributes) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          map[a.type].push(a);
        }
      }
    }
    return map;
  }, [product.variants]);

  // Quando l'utente clicca un attributo, cerca una variante che abbia quell'attributo e le altre selezioni
  const selectAttr = (type: AttrType, attrId: string) => {
    const current = selectedVariant;
    if (!current) return;
    // Attributi correnti per gli altri tipi
    const otherAttrs = current.attributes.filter((a) => a.type !== type).map((a) => a.id);
    // Cerca variante che ha attrId + tutti otherAttrs
    const match = product.variants.find((v) =>
      v.attributes.some((a) => a.id === attrId) &&
      otherAttrs.every((oid) => v.attributes.some((a) => a.id === oid))
    );
    if (match) {
      setSelectedVariantId(match.id);
      return;
    }
    // Fallback: una qualsiasi variante che contenga quell'attributo
    const fallback = product.variants.find((v) => v.attributes.some((a) => a.id === attrId));
    if (fallback) setSelectedVariantId(fallback.id);
  };

  const selectedAttrIds = new Set(selectedVariant?.attributes.map((a) => a.id));

  // Immagini: prima la cover variante scelta, poi le sue galleryImages, poi cover prodotto + gallery shop
  const heroImages = useMemo(() => {
    const imgs: string[] = [];
    if (selectedVariant?.coverImage) imgs.push(selectedVariant.coverImage);
    imgs.push(...parseList(selectedVariant?.galleryImages || null));
    if (product.coverImage && !imgs.includes(product.coverImage)) imgs.push(product.coverImage);
    imgs.push(...parseList(product.galleryImages).filter((u) => !imgs.includes(u)));
    return imgs;
  }, [product, selectedVariant]);

  const catalogGallery = useMemo(() => {
    const all = parseList(product.catalogGalleryImages);
    const excluded = new Set(parseList(product.excludedCatalogImages));
    return all.filter((u) => !excluded.has(u));
  }, [product.catalogGalleryImages, product.excludedCatalogImages]);

  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Reset imageIdx quando variante cambia
  useEffect(() => { setActiveImgIdx(0); }, [selectedVariantId]);

  const inStock = selectedVariant
    ? !selectedVariant.trackStock || (selectedVariant.stockQty ?? 0) > 0
    : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="aspect-square bg-warm-100 relative rounded overflow-hidden">
          {heroImages[activeImgIdx] ? (
            <Image
              src={heroImages[activeImgIdx]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          ) : null}
        </div>
        {heroImages.length > 1 && (
          <div className="grid grid-cols-6 gap-2">
            {heroImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImgIdx(i)}
                className={`aspect-square rounded overflow-hidden relative border-2 ${i === activeImgIdx ? "border-warm-900" : "border-transparent hover:border-warm-300"}`}
              >
                <Image src={img} alt="" fill sizes="100px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info + varianti + CTA */}
      <div>
        <div className="mb-4">
          {product.category && (
            <div className="text-xs uppercase tracking-[0.2em] text-warm-500">{product.category.name}</div>
          )}
          <h1 className="text-3xl md:text-4xl font-light text-warm-900 mt-1">{product.name}</h1>
          {product.designer && (
            <div className="text-sm text-warm-500 mt-1">design <strong>{product.designer.name}</strong></div>
          )}
        </div>

        {product.shortDescription && (
          <p className="text-warm-700 leading-relaxed mb-5">{product.shortDescription}</p>
        )}

        {/* Selettore varianti per tipo */}
        <div className="space-y-4 py-5 border-y border-warm-200">
          {(["MATERIAL", "FINISH", "COLOR"] as AttrType[]).map((type) => {
            const available = attrByType[type];
            if (available.length === 0) return null;
            const current = selectedVariant?.attributes.find((a) => a.type === type);
            return (
              <div key={type}>
                <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-2">
                  {type === "MATERIAL" ? "Materiale" : type === "FINISH" ? "Finitura" : "Colore"}
                  {current && <span className="ml-2 text-warm-800 normal-case tracking-normal">· {current.label}</span>}
                </div>
                <div className={type === "COLOR" ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
                  {available.map((a) => {
                    const isSel = selectedAttrIds.has(a.id);
                    if (type === "COLOR") {
                      return (
                        <button
                          key={a.id}
                          onClick={() => selectAttr(type, a.id)}
                          title={a.label}
                          className={`w-9 h-9 rounded-full border-2 transition-all ${isSel ? "border-warm-900 scale-110" : "border-warm-200 hover:border-warm-400"}`}
                          style={{ backgroundColor: a.hexColor || "#ccc" }}
                        />
                      );
                    }
                    return (
                      <button
                        key={a.id}
                        onClick={() => selectAttr(type, a.id)}
                        className={`px-3 py-1.5 text-sm border transition-colors ${isSel ? "border-warm-900 bg-warm-900 text-white" : "border-warm-200 text-warm-700 hover:border-warm-400"}`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prezzo + CTA */}
        <div className="py-5">
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-3xl font-light text-warm-900">
              {selectedVariant ? eur(selectedVariant.priceCents) : "—"}
            </div>
            {selectedVariant && (
              <div className="text-xs text-warm-500 font-mono">SKU {selectedVariant.sku}</div>
            )}
          </div>
          <div className="text-xs text-warm-500 mb-4">IVA inclusa · spedizione calcolata al checkout</div>

          <div className="flex items-center gap-3 mb-3 text-sm">
            {inStock ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Disponibile
                {selectedVariant?.trackStock && <span className="text-warm-500">({selectedVariant.stockQty})</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Non disponibile
              </span>
            )}
          </div>

          <button
            disabled={!inStock}
            className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 disabled:bg-warm-300 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={16} /> Aggiungi al carrello
          </button>
          <div className="mt-2 text-xs text-warm-500 text-center">
            <Info size={11} className="inline mr-1" />
            Pagamenti in arrivo. Il carrello sarà attivo a breve.
          </div>
        </div>

        {/* Specs rapide */}
        {selectedVariant && (
          <div className="py-5 border-t border-warm-200 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-warm-500 mb-1 inline-flex items-center gap-1">
                <Package size={10} /> Volume
              </div>
              <div className="text-warm-800 font-mono">{selectedVariant.volumeM3.toFixed(3)} m³</div>
            </div>
            {selectedVariant.weightKg !== null && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-warm-500 mb-1">Peso</div>
                <div className="text-warm-800 font-mono">{selectedVariant.weightKg.toFixed(1)} kg</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-warm-500 mb-1 inline-flex items-center gap-1">
                <Ruler size={10} /> Spedizione
              </div>
              <div className="text-warm-800 text-xs">
                {selectedVariant.shippingClass === "QUOTE_ONLY" ? "Su preventivo" : "Standard"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Descrizione estesa */}
      {product.marketingDescription && (
        <div className="lg:col-span-2 mt-8 prose prose-sm max-w-3xl">
          <h2 className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-4">Descrizione</h2>
          <div className="text-warm-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.marketingDescription }} />
        </div>
      )}

      {/* Slideshow catalogo in fondo */}
      {catalogGallery.length > 0 && (
        <section className="lg:col-span-2 mt-10 pt-10 border-t border-warm-200">
          <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-6">Dal catalogo</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {catalogGallery.map((img, i) => (
              <div key={i} className="aspect-square bg-warm-100 rounded overflow-hidden relative">
                <Image src={img} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
