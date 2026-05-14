"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Ruler, ShoppingBag, Heart, Maximize2, X as XIcon, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useCart } from "@/contexts/CartContext";
import GallerySlideshow from "@/components/site/GallerySlideshow";
import ProductCard, { type ProductCardData } from "./ProductCard";

type AttrType =
  | "MATERIAL"
  | "FINISH"
  | "COLOR"
  | "STRUCTURE"
  | "SEAT"
  | "UPHOLSTERY"
  | "INSERT"
  | "CONFIGURATION"
  | "OTHER";

// Ordine di rendering + label visibile per ogni tipo attributo.
const ATTR_TYPE_ORDER: AttrType[] = ["STRUCTURE", "SEAT", "COLOR", "MATERIAL", "FINISH", "UPHOLSTERY", "INSERT", "CONFIGURATION", "OTHER"];
const ATTR_TYPE_LABEL: Record<AttrType, string> = {
  MATERIAL: "Materiale",
  FINISH: "Finitura",
  COLOR: "Colore",
  STRUCTURE: "Struttura",
  SEAT: "Seduta",
  UPHOLSTERY: "Imbottitura",
  INSERT: "Inserti",
  CONFIGURATION: "Variante",
  OTHER: "Opzione",
};

interface Attribute {
  id: string;
  type: AttrType;
  code: string;
  hexColor: string | null;
  imageUrl: string | null;
  label: string;
}

interface Variant {
  id: string;
  sku: string;
  priceCents: number;
  salePriceCents: number | null;
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

interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  marketingDescription: string | null;
  deliveryLeadTime?: string;
  coverImage: string | null;
  galleryImages: string | null;
  excludedCatalogImages: string | null;
  catalogGalleryImages: string | null;
  materials: string | null;
  dimensions: string | null;
  category: { slug: string; name: string } | null;
  designer: { name: string; slug: string; bio: string | null; country: string | null; imageUrl: string | null } | null;
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
  const [showAddedModal, setShowAddedModal] = useState(false);

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

  // Prezzo effettivamente pagato (sale se presente e < listino, altrimenti listino)
  const effectivePriceCents = (v: Variant): number =>
    v.salePriceCents != null && v.salePriceCents > 0 && v.salePriceCents < v.priceCents
      ? v.salePriceCents
      : v.priceCents;
  const hasDiscount = (v: Variant): boolean =>
    v.salePriceCents != null && v.salePriceCents > 0 && v.salePriceCents < v.priceCents;

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
      priceCents: effectivePriceCents(selectedVariant),
      coverImage: selectedVariant.coverImage || product.coverImage,
      volumeM3: selectedVariant.volumeM3,
      weightKg: selectedVariant.weightKg,
      shippingClass: selectedVariant.shippingClass,
    }, 1);
    setJustAdded(true);
    setShowAddedModal(true);
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

  // Tutti i valori attributo disponibili per il prodotto, raggruppati per tipo
  // (dedup tra varianti).
  const attrByType = useMemo(() => {
    const map: Record<AttrType, Attribute[]> = {
      MATERIAL: [], FINISH: [], COLOR: [],
      STRUCTURE: [], SEAT: [], UPHOLSTERY: [], INSERT: [], CONFIGURATION: [],
      OTHER: [],
    };
    const seen = new Set<string>();
    for (const v of product.variants) {
      for (const a of v.attributes) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          if (map[a.type]) map[a.type].push(a);
          else map[a.type] = [a];
        }
      }
    }
    return map;
  }, [product.variants]);

  const hasAttributeVariants = useMemo(
    () => Object.values(attrByType).some((arr) => arr.length > 0),
    [attrByType]
  );

  // Tipi attributo che NON appaiono su nessuna variante (es. opzioni custom
  // globali). Verrebbero filtrati via dal cascading sotto: li gestiamo a parte
  // mantenendoli sempre visibili.
  const nonVariantizedTypes = useMemo(() => {
    const set = new Set<AttrType>();
    for (const t of ATTR_TYPE_ORDER) {
      if ((attrByType[t]?.length || 0) === 0) set.add(t);
    }
    return set;
  }, [attrByType]);

  // ─── Soft selection ────────────────────────────────────────────────────
  // userChoices è la selezione "umana" per ogni tipo (1 valore per tipo).
  // Quando l'utente clicca un attributo:
  //   - se clicca lo stesso valore già selezionato → deseleziona (null)
  //   - altrimenti imposta quel valore
  // Dopo ogni cambio, cerchiamo la variante che soddisfa TUTTE le scelte;
  // se trovata, la selezioniamo (cambia prezzo/sku). Se nessuna variante
  // matcha, restiamo sulla variante corrente — la scelta dell'utente resta
  // visibile come "richiesta di configurazione".
  const [userChoices, setUserChoices] = useState<Partial<Record<AttrType, string | null>>>({});

  // Inizializza userChoices in base alla variante selezionata: per ogni tipo
  // prendiamo il valore della variante (se presente). I tipi non presenti sulla
  // variante restano null (l'utente li sceglie liberamente come opzione custom).
  useEffect(() => {
    if (!selectedVariant) return;
    const next: Partial<Record<AttrType, string | null>> = {};
    for (const a of selectedVariant.attributes) {
      // Per il tipo di un attributo presente più volte, l'ultima vince.
      // In pratica le varianti ben formate hanno max 1 valore per tipo.
      next[a.type] = a.id;
    }
    setUserChoices(next);
  }, [selectedVariant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: trova la variante che meglio soddisfa la combinazione di attributi
  // desiderata. Preferisce un match ESATTO (tutti gli id presenti). Se non esiste,
  // sceglie quella che contiene la maggior parte degli id voluti, dando priorità
  // all'attributo appena cliccato.
  const findBestVariant = (intended: Partial<Record<AttrType, string | null>>, priorityType: AttrType, priorityId: string | null) => {
    const wantedIds = Object.values(intended).filter((v): v is string => !!v);
    if (wantedIds.length === 0) return null;
    // 1. Match esatto: variante che contiene TUTTI gli id
    const exact = product.variants.find((v) => wantedIds.every((id) => v.attributes.some((a) => a.id === id)));
    if (exact) return exact;
    // 2. Match parziale: deve contenere ALMENO l'attributo prioritario (se valorizzato)
    const candidates = priorityId
      ? product.variants.filter((v) => v.attributes.some((a) => a.id === priorityId))
      : product.variants.slice();
    if (candidates.length === 0) return null;
    let best: Variant | null = null;
    let bestScore = -1;
    for (const v of candidates) {
      const score = wantedIds.filter((id) => v.attributes.some((a) => a.id === id)).length;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  };

  const selectAttr = (type: AttrType, attrId: string) => {
    setUserChoices((prev) => {
      // Toggle: stesso valore → deseleziona, altrimenti seleziona
      const newType = prev[type] === attrId ? null : attrId;
      const intended: Partial<Record<AttrType, string | null>> = { ...prev, [type]: newType };

      // Cerca la variante migliore data l'intenzione
      const best = findBestVariant(intended, type, newType);
      if (!best) {
        // Nessuna variante: lasciamo l'intenzione così com'è (config su richiesta)
        return intended;
      }

      // Cambia variante (solo se diversa)
      if (best.id !== selectedVariantId) {
        setSelectedVariantId(best.id);
      }

      // Riconcilia userChoices: SOLO valori che la variante effettivamente ha.
      // Per gli altri tipi che l'utente aveva selezionato ma non sono sulla
      // variante → li deseleziono per non avere "fantasmi". Per i tipi presenti
      // sulla variante ma non scelti dall'utente → li pre-seleziono.
      const reconciled: Partial<Record<AttrType, string | null>> = {};
      for (const a of best.attributes) {
        reconciled[a.type] = a.id;
      }
      // Mantieni la scelta utente per attributi NON variantizzati (cioè tipi che
      // non compaiono su NESSUNA variante — usati come "config richiesta")
      for (const t of ATTR_TYPE_ORDER) {
        if (reconciled[t]) continue;
        const userChoice = intended[t];
        if (!userChoice) continue;
        // È un attributo davvero esistente in qualche variante?
        const isOnAnyVariant = product.variants.some((v) => v.attributes.some((a) => a.id === userChoice));
        if (!isOnAnyVariant) reconciled[t] = userChoice;
      }
      return reconciled;
    });
  };

  // Set delle scelte attuali (per highlight nei button)
  const selectedAttrIds = new Set(Object.values(userChoices).filter(Boolean) as string[]);

  // ─── Cascading filter (dependent selectors, ordine-based) ─────────────
  // Per ogni tipo T (in posizione i di ATTR_TYPE_ORDER) i valori disponibili
  // sono filtrati SOLO dalle scelte sui tipi PRECEDENTI (posizione < i).
  // Questo garantisce che:
  //   - i "fratelli" dello stesso tipo restano sempre cliccabili (puoi sempre
  //     cambiare la Seduta da Imbottita a Legno);
  //   - i tipi PIÙ AVANTI nell'ordine vengono filtrati dalle scelte fatte sui
  //     tipi precedenti (es. "Imbottitura" appare/scompare in base a "Seduta").
  // Se 0 valori disponibili → il gruppo non viene renderizzato.
  const availableByType = useMemo(() => {
    const result: Partial<Record<AttrType, Attribute[]>> = {};
    for (let i = 0; i < ATTR_TYPE_ORDER.length; i++) {
      const t = ATTR_TYPE_ORDER[i];
      // Tipi non variantizzati: sempre tutti i valori
      if (nonVariantizedTypes.has(t)) {
        result[t] = attrByType[t] || [];
        continue;
      }
      // Scelte sui tipi PRECEDENTI valorizzate
      const upstreamChoices: string[] = [];
      for (let j = 0; j < i; j++) {
        const ut = ATTR_TYPE_ORDER[j];
        if (nonVariantizedTypes.has(ut)) continue;
        const id = userChoices[ut];
        if (id) upstreamChoices.push(id);
      }
      // Varianti compatibili con le scelte upstream
      const compatibleVariants = product.variants.filter((v) =>
        upstreamChoices.every((id) => v.attributes.some((a) => a.id === id))
      );
      // Raccogli i valori di tipo T (dedup per id)
      const seenIds = new Set<string>();
      const values: Attribute[] = [];
      for (const v of compatibleVariants) {
        for (const a of v.attributes) {
          if (a.type !== t) continue;
          if (seenIds.has(a.id)) continue;
          seenIds.add(a.id);
          values.push(a);
        }
      }
      result[t] = values;
    }
    return result;
  }, [userChoices, attrByType, product.variants, nonVariantizedTypes]);

  // Galleria hero unificata:
  // 1. PRIMA tutte le immagini del prodotto (cover + gallery store, deduplicate)
  // 2. POI le immagini delle varianti NON default (cover + gallery), in ordine
  // La variante default NON contribuisce con immagini proprie: si rifà alla prima
  // immagine del prodotto. Così sono sempre tutte visibili contemporaneamente;
  // cliccando una variante salto al suo indice nella griglia.
  const heroImages = useMemo(() => {
    const imgs: string[] = [];
    const seen = new Set<string>();
    const add = (u: string | null | undefined) => {
      if (u && !seen.has(u)) { seen.add(u); imgs.push(u); }
    };
    // Step 1: immagini prodotto
    add(product.coverImage);
    for (const u of parseList(product.galleryImages)) add(u);
    // Step 2: immagini delle varianti NON default
    for (const v of product.variants) {
      if (v.isDefault) continue; // la default usa la prima immagine prodotto
      add(v.coverImage);
      for (const u of parseList(v.galleryImages)) add(u);
    }
    return imgs;
  }, [product]);

  // Mappa variantId → indice in heroImages.
  // - Variante default → 0 (prima immagine prodotto)
  // - Variante non default → indice della sua prima immagine, oppure 0 come fallback
  const variantImageIndex = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of product.variants) {
      if (v.isDefault) { map[v.id] = 0; continue; }
      const firstVariantImg = v.coverImage || parseList(v.galleryImages)[0] || null;
      const idx = firstVariantImg ? heroImages.indexOf(firstVariantImg) : -1;
      map[v.id] = idx >= 0 ? idx : 0;
    }
    return map;
  }, [product.variants, heroImages]);

  // Catalog gallery — usa esattamente la galleria del prodotto del sito normale
  // (Product.galleryImages), togliendo solo quelle escluse dal CMS store.
  // NON filtriamo per heroImages: l'utente vuole vedere tutte le foto del catalogo
  // anche se alcune sono già nel hero (sono in posizioni diverse della pagina).
  const catalogGallery = useMemo(() => {
    const all = parseList(product.catalogGalleryImages);
    const excluded = new Set(parseList(product.excludedCatalogImages));
    return all.filter((u) => !excluded.has(u));
  }, [product.catalogGalleryImages, product.excludedCatalogImages]);

  // Auto-detect orientation per dividere verticali (per la sezione descrizione)
  // dalle orizzontali (per lo slideshow tipo sito principale).
  const [imageOrientations, setImageOrientations] = useState<Record<string, "h" | "v">>({});
  useEffect(() => {
    if (catalogGallery.length === 0) return;
    let cancelled = false;
    catalogGallery.forEach((url) => {
      if (imageOrientations[url]) return;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        const orient: "h" | "v" = img.naturalWidth >= img.naturalHeight ? "h" : "v";
        setImageOrientations((prev) => (prev[url] ? prev : { ...prev, [url]: orient }));
      };
      img.src = url;
    });
    return () => { cancelled = true; };
  }, [catalogGallery, imageOrientations]);

  // Split immagini catalogo: verticali (per slideshow accanto descrizione) +
  // orizzontali (per slideshow Ispirazione sotto). Fino a che orientations non
  // sono misurate, default = orizzontale.
  const verticalCatalog = useMemo(
    () => catalogGallery.filter((u) => imageOrientations[u] === "v"),
    [catalogGallery, imageOrientations]
  );
  const horizontalCatalog = useMemo(
    () => catalogGallery.filter((u) => imageOrientations[u] !== "v"),
    [catalogGallery, imageOrientations]
  );

  // Slideshow verticale accanto alla descrizione (1 immagine alla volta)
  const [descrSlideIdx, setDescrSlideIdx] = useState(0);
  useEffect(() => { setDescrSlideIdx(0); }, [verticalCatalog.length]);

  // Quando cambia la variante selezionata salta all'immagine di quella variante
  // (se la variante non ha immagini proprie, va alla prima del prodotto).
  useEffect(() => {
    const idx = variantImageIndex[selectedVariantId];
    setActiveImgIdx(idx !== undefined && idx >= 0 ? idx : 0);
  }, [selectedVariantId, variantImageIndex]);

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
  const [related, setRelated] = useState<ProductCardData[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedShown, setRelatedShown] = useState(RELATED_PAGE_SIZE);
  const [relatedFavSet, setRelatedFavSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams({ lang: "it" });
    if (product.category?.slug) params.set("category", product.category.slug);
    fetch(`/api/store/public/products?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const filtered = (d.data as ProductCardData[]).filter((p) => p.id !== product.id);
          setRelated(filtered);
        }
      })
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [product.id, product.category?.slug]);

  useEffect(() => {
    if (!customer) { setRelatedFavSet(new Set()); return; }
    fetch("/api/store/public/favorites?lang=it", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ids = new Set((d.data as { storeProductId: string }[]).map((f) => f.storeProductId));
          setRelatedFavSet(ids);
        }
      })
      .catch(() => {});
  }, [customer]);

  return (
    <>
      {/* ═══ Top: galleria + info ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          <div
            ref={heroRef}
            className="aspect-[4/5] bg-warm-50 relative overflow-hidden cursor-zoom-in group"
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
                className="object-contain transition-transform duration-200 ease-out"
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
            <div className="mt-2 text-[12px] text-warm-500 tracking-[0.06em]">
              design by <span className="text-warm-800">{product.designer.name}</span>
            </div>
          )}

          {/* Descrizione breve: la variante selezionata può avere una description
              propria (varia per variante). Se presente la mostro al posto della
              shortDescription del prodotto. */}
          {(selectedVariant?.description || product.shortDescription) && (
            <p className="mt-5 text-[15px] text-warm-700 leading-[1.6]">
              {selectedVariant?.description || product.shortDescription}
            </p>
          )}

          {/* Variant selector — attributi cliccabili (soft-selection) */}
          {hasAttributeVariants ? (
            <div className="mt-7 space-y-5 pt-6 border-t border-warm-200">
              {ATTR_TYPE_ORDER.map((type) => {
                // Cascading: mostra solo i valori compatibili con le altre scelte attuali
                const available = availableByType[type] || [];
                if (available.length === 0) return null;
                const chosenId = userChoices[type];
                const chosenLabel = available.find((a) => a.id === chosenId)?.label;
                return (
                  <div key={type}>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-warm-500 mb-2.5">
                      {ATTR_TYPE_LABEL[type]}
                      {chosenLabel && (
                        <span className="ml-2 text-warm-900 normal-case tracking-normal text-[12px]">· {chosenLabel}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {available.map((a) => {
                        const isSel = selectedAttrIds.has(a.id);
                        // Cerchio swatch: usato per COLOR e per qualsiasi valore
                        // con imageUrl (es. Imbottitura caricata come campione).
                        if (a.imageUrl) {
                          return (
                            <button
                              key={a.id}
                              onClick={() => selectAttr(type, a.id)}
                              title={a.label}
                              aria-label={a.label}
                              className={`w-10 h-10 rounded-full border-2 bg-cover bg-center transition-all ${isSel ? "border-warm-900 scale-110" : "border-warm-200 hover:border-warm-400"}`}
                              style={{ backgroundImage: `url(${a.imageUrl})` }}
                            />
                          );
                        }
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
                            className={`px-3 py-1.5 text-[12px] tracking-[0.04em] border transition-colors ${
                              isSel
                                ? "border-warm-900 bg-warm-900 text-white"
                                : "border-warm-200 text-warm-700 hover:border-warm-500"
                            }`}
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
          ) : product.variants.length > 1 ? (
            <div className="mt-7 pt-6 border-t border-warm-200">
              <div className="text-[10px] uppercase tracking-[0.22em] text-warm-500 mb-2.5">
                Variante <span className="text-warm-400 normal-case tracking-normal">({product.variants.length} opzioni)</span>
              </div>
              <div className="flex flex-col gap-2">
                {product.variants.map((v) => {
                  const shortName = shortenVariantLabel(v.name, product.name) || v.sku;
                  const isSel = v.id === selectedVariantId;
                  const vPrice = v.salePriceCents != null && v.salePriceCents > 0 && v.salePriceCents < v.priceCents ? v.salePriceCents : v.priceCents;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`w-full text-left px-4 py-3 border transition-colors flex items-center justify-between gap-3 ${
                        isSel
                          ? "border-warm-900 bg-warm-900 text-white"
                          : "border-warm-200 text-warm-700 hover:border-warm-500"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 w-3.5 h-3.5 rounded-full border-2 ${
                            isSel ? "border-white bg-white" : "border-warm-400"
                          }`}
                        />
                        <span className="text-[13px] tracking-[0.02em] truncate">{shortName}</span>
                      </span>
                      {vPrice > 0 && (
                        <span className={`text-[12px] font-mono shrink-0 ${isSel ? "text-white/80" : "text-warm-500"}`}>
                          {eur(vPrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Price + CTA */}
          <div className="mt-7 pt-6 border-t border-warm-200">
            <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
              <div className="flex items-baseline gap-3 flex-wrap">
                <div className="text-[34px] font-light text-warm-900 tracking-tight">
                  {selectedVariant ? (
                    selectedVariant.priceCents > 0 ? (
                      eur(effectivePriceCents(selectedVariant))
                    ) : (
                      <span className="italic text-[24px] text-warm-700">Prezzo su richiesta</span>
                    )
                  ) : "—"}
                </div>
                {selectedVariant && hasDiscount(selectedVariant) && (
                  <>
                    <span className="text-warm-400 line-through text-[18px]">
                      {eur(selectedVariant.priceCents)}
                    </span>
                    <span className="text-[12px] uppercase tracking-wider bg-warm-100 text-warm-900 px-2 py-1 rounded-sm font-semibold">
                      -{Math.round((1 - effectivePriceCents(selectedVariant) / selectedVariant.priceCents) * 100)}%
                    </span>
                  </>
                )}
              </div>
              {selectedVariant && (
                <div className="text-[10px] text-warm-500 font-mono tracking-wide">SKU {selectedVariant.sku}</div>
              )}
            </div>
            <div className="text-[11px] text-warm-500 mb-4">
              {selectedVariant && selectedVariant.priceCents > 0
                ? "IVA inclusa · spedizione calcolata al checkout"
                : "Contattaci per un preventivo personalizzato"}
            </div>

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
              {selectedVariant && selectedVariant.priceCents > 0 ? (
                <button
                  disabled={!inStock}
                  onClick={handleAddToCart}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 text-white uppercase text-[12px] tracking-[0.18em] disabled:bg-warm-300 disabled:cursor-not-allowed transition-colors ${justAdded ? "bg-emerald-600 hover:bg-emerald-700" : "bg-warm-900 hover:bg-warm-800"}`}
                >
                  <ShoppingBag size={15} /> {justAdded ? "Aggiunto" : "Aggiungi al carrello"}
                </button>
              ) : (
                <a
                  href={`/contatti/richiesta-info?product=${encodeURIComponent(product.name)}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 text-white uppercase text-[12px] tracking-[0.18em] bg-warm-900 hover:bg-warm-800 transition-colors"
                >
                  Richiedi un preventivo
                </a>
              )}
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

          {/* ── Tempo di consegna ── */}
          {selectedVariant && (
            <div className="mt-7 pt-6 border-t border-warm-200">
              <BigSpec
                icon={<Ruler size={14} />}
                label="Consegna"
                value={selectedVariant.shippingClass === "QUOTE_ONLY" ? "Su preventivo" : (product.deliveryLeadTime || "4–6 settimane")}
              />
            </div>
          )}

          {/* Variant dimensions — singola riga con codici W H D SH e tooltip legenda */}
          {selectedVariant?.dimensions && Object.keys(selectedVariant.dimensions.values).length > 0 && (
            <DimensionsRow
              labels={selectedVariant.dimensions.labels}
              values={selectedVariant.dimensions.values}
              blockName={selectedVariant.dimensions.blockName}
            />
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

      {/* ═══ Sezione Ispirazione: titolo grande + testo descrizione a sinistra +
              slideshow verticale a destra (1 foto alla volta, niente crop) +
              slideshow orizzontale sotto, full-width (object-contain) ═══ */}
      {(product.marketingDescription || verticalCatalog.length > 0 || horizontalCatalog.length > 0) && (
        <section className="mt-20 pt-14 border-t border-warm-200">
          <h2 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-warm-900 tracking-[-0.005em] mb-8 lg:mb-10">
            Ispirazione
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">
            {/* Testo descrizione (sinistra) */}
            <div className={`text-[15px] text-warm-700 leading-[1.75] max-w-[640px]
              [&_h1]:font-serif [&_h1]:text-[30px] [&_h1]:text-warm-900 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-[-0.005em]
              [&_h2]:font-serif [&_h2]:text-[26px] [&_h2]:text-warm-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:tracking-[-0.005em]
              [&_h3]:font-serif [&_h3]:text-[19px] [&_h3]:text-warm-900 [&_h3]:mt-6 [&_h3]:mb-3
              [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1.5
              [&_blockquote]:border-l-2 [&_blockquote]:border-warm-300 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-warm-600 [&_blockquote]:my-6
              [&_strong]:font-semibold [&_strong]:text-warm-900`.replace(/\s+/g, " ")}>
              {product.marketingDescription
                ? <div dangerouslySetInnerHTML={{ __html: /<\/?(p|div|h[1-6]|ul|ol|li|strong|em|blockquote|br|a)\b/i.test(product.marketingDescription) ? product.marketingDescription : renderMarkdown(product.marketingDescription) }} />
                : <p className="text-warm-500 italic">Descrizione in arrivo.</p>}
            </div>

            {/* Slideshow VERTICALE a destra — 1 foto alla volta, aspect 3/4
                con object-contain → niente taglio. Frecce + indicatore. */}
            {verticalCatalog.length > 0 && (
              <div className="self-start">
                <div className="relative bg-warm-50 overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
                  <Image
                    src={verticalCatalog[descrSlideIdx % verticalCatalog.length]}
                    alt={`${product.name} — ${descrSlideIdx + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-contain"
                    priority
                  />
                  {verticalCatalog.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDescrSlideIdx((i) => (i - 1 + verticalCatalog.length) % verticalCatalog.length)}
                        aria-label="Immagine precedente"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-warm-900 flex items-center justify-center shadow-sm transition"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescrSlideIdx((i) => (i + 1) % verticalCatalog.length)}
                        aria-label="Immagine successiva"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-warm-900 flex items-center justify-center shadow-sm transition"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] tracking-wider text-warm-700 bg-white/85 px-2.5 py-0.5 rounded-full">
                        {descrSlideIdx + 1} / {verticalCatalog.length}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Slideshow ORIZZONTALE sotto (full-width) — object-contain via GallerySlideshow */}
          {horizontalCatalog.length > 0 && (
            <div className="mt-14 lg:mt-20 -mx-4 lg:-mx-8">
              <GallerySlideshow images={horizontalCatalog} name={product.name} />
            </div>
          )}
        </section>
      )}

      {/* ═══ Sezione Designer — 40/60 split, no full-bleed, no CTA ═══ */}
      {product.designer && (product.designer.bio || product.designer.imageUrl) && (
        <section className="mt-20" style={{ backgroundColor: "#f9f8f6" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-0 items-center">
            <div className="relative w-full aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
              {product.designer.imageUrl ? (
                <Image
                  src={product.designer.imageUrl}
                  alt={product.designer.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-warm-400 text-sm">
                  (Foto designer non disponibile)
                </div>
              )}
            </div>
            <div className="px-8 sm:px-12 md:px-16 lg:pl-16 xl:pl-20 lg:pr-12 xl:pr-16 py-12 lg:py-16">
              <p className="uppercase text-[13px] tracking-[0.03em] text-black font-light">Designer</p>
              <h2 className="font-sans text-[26px] md:text-[30px] lg:text-[32px] text-black leading-[1.1] font-light uppercase tracking-[inherit] mt-2">
                {product.designer.name}
              </h2>
              {product.designer.country && (
                <p className="text-[13px] text-warm-500 mt-1">{product.designer.country}</p>
              )}
              {product.designer.bio && (
                <div
                  className="text-[15px] md:text-[16px] text-black leading-[1.55] font-light max-w-[640px] mt-5 [&_p]:m-0 [&_p+p]:mt-3"
                  dangerouslySetInnerHTML={{
                    __html: product.designer.bio.includes("<") ? product.designer.bio : `<p>${product.designer.bio.replace(/\n+/g, "</p><p>")}</p>`,
                  }}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Sezione Prodotti correlati — stesse card della pagina shop ═══ */}
      {(relatedLoading || related.length > 0) && (
        <section className="mt-20 pt-14 border-t border-warm-200">
          <p className="uppercase text-[14px] tracking-[0.03em] text-black font-light mb-2">Prodotti correlati</p>
          <h2 className="font-sans text-[28px] md:text-[34px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-12">
            {product.category?.name ? `Altro da ${product.category.name}` : "Altri prodotti dello shop"}
          </h2>
          {relatedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {related.slice(0, relatedShown).map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    favorited={relatedFavSet.has(p.id)}
                    onFavoriteChange={(isFav) => {
                      setRelatedFavSet((prev) => {
                        const next = new Set(prev);
                        if (isFav) next.add(p.id); else next.delete(p.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
              {related.length > relatedShown && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setRelatedShown((n) => n + RELATED_PAGE_SIZE)}
                    className="px-8 py-3 border border-warm-900 text-warm-900 uppercase text-[12px] tracking-[0.18em] hover:bg-warm-900 hover:text-white transition-colors"
                  >
                    Carica altri ({Math.min(RELATED_PAGE_SIZE, related.length - relatedShown)})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ═══ Lightbox modal ═══ */}
      {/* ═══ Popup conferma aggiunta al carrello ═══ */}
      {showAddedModal && selectedVariant && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowAddedModal(false)}
        >
          <div
            className="bg-white max-w-md w-full p-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              {(selectedVariant.coverImage || product.coverImage) && (
                <div className="relative w-20 h-24 bg-warm-50 flex-shrink-0 overflow-hidden">
                  <Image
                    src={selectedVariant.coverImage || product.coverImage!}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700 font-semibold mb-1.5 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aggiunto al carrello
                </div>
                <div className="text-warm-900 text-[15px] font-medium leading-tight">{product.name}</div>
                {selectedVariant.attributes.length > 0 && (
                  <div className="text-warm-500 text-[12px] mt-1">
                    {selectedVariant.attributes.map((a) => a.label).join(" · ")}
                  </div>
                )}
                <div className="text-warm-900 font-mono text-[14px] mt-1.5">
                  {eur(effectivePriceCents(selectedVariant))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="text-warm-400 hover:text-warm-900 -mr-2 -mt-2 p-2"
                aria-label="Chiudi"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 border border-warm-300 text-warm-900 uppercase text-[12px] tracking-[0.18em] hover:bg-warm-50"
              >
                Continua shopping
              </button>
              <a
                href="/carrello"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-warm-900 text-white uppercase text-[12px] tracking-[0.18em] hover:bg-warm-800"
              >
                <ShoppingBag size={14} /> Vai al carrello ({cartCount})
              </a>
            </div>
          </div>
        </div>
      )}

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

// Accorcia il nome della variante per il selettore: rimuove boilerplate come
// "Fusto grezzo", "*** FSC 100% ***", il nome del prodotto e parole non utili,
// lasciando la parte distintiva (es. "Seduta imbottita", "altezza 200 cm").
function shortenVariantLabel(rawName: string | null, productName: string): string {
  if (!rawName) return "";
  let s = rawName;
  // Rimuovi marker FSC / asterischi
  s = s.replace(/\*+\s*FSC[^*]*\*+/gi, "");
  s = s.replace(/\*{2,}/g, "");
  // Rimuovi prefissi tecnici comuni
  s = s.replace(/^\s*(fusto|telaio)\s+grezzo\b/gi, "");
  // Rimuovi il nome del prodotto (case-insensitive)
  if (productName) {
    const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
  }
  // Anche le forme "Cafe stuhl" senza accento o varianti con spazio
  s = s.replace(/\bCafe ?stuhl\b/gi, "");
  // Pulizia spazi e punteggiatura residua
  s = s.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/^[\s\-—·,.;:]+/, "").replace(/[\s\-—·,.;:]+$/, "");
  if (!s) return "";
  // Maiuscola iniziale
  return s.charAt(0).toUpperCase() + s.slice(1);
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

// ─── DimensionsRow ──────────────────────────────────────────────────────
// Mostra le dimensioni di una variante su una sola riga usando codici
// abbreviati (W, H, D, SH). L'icona "i" mostra la legenda al hover/click.
const DIMENSION_ABBREVIATIONS: { match: RegExp; abbr: string; full: string }[] = [
  // Abbreviazioni già usate nei DimensionBlock: vanno matchate per prime così
  // un label già abbreviato come "SH" non passa al fallback charAt(0) → "S".
  // SHH e AH prima di SH/H per evitare match parziali su stringhe più lunghe.
  { match: /^(SHH|S\.?H\.?H\.?)$/i, abbr: "SHH", full: "altezza impilamento" },
  { match: /^(SH|S\.?H\.?)$/i, abbr: "SH", full: "altezza seduta" },
  { match: /^(AH|A\.?H\.?)$/i, abbr: "AH", full: "altezza bracciolo" },
  { match: /^W$/i, abbr: "W", full: "larghezza" },
  { match: /^H$/i, abbr: "H", full: "altezza" },
  { match: /^D$/i, abbr: "D", full: "profondità" },
  { match: /^L$/i, abbr: "L", full: "lunghezza" },
  { match: /^(Ø|O)$/i, abbr: "Ø", full: "diametro" },
  // Forme estese multilingua (più specifiche prima delle generiche)
  { match: /^(altezza impilamento|altezza in pila|stacking height|stapelh[oö]he)$/i, abbr: "SHH", full: "altezza impilamento" },
  { match: /^(altezza bracciolo|arm height|armh[oö]he|hauteur (d['’]?)?accoudoir|altura (del )?brazo)$/i, abbr: "AH", full: "altezza bracciolo" },
  { match: /^(altezza seduta|seat height|sitzh[oö]he|hauteur d['’]?assise|altura (del )?asiento|altura asiento)$/i, abbr: "SH", full: "altezza seduta" },
  { match: /^(larghezza|width|breite|largeur|anchura|ancho)$/i, abbr: "W", full: "larghezza" },
  { match: /^(profondit[aà]|depth|tiefe|profondeur|profundidad)$/i, abbr: "D", full: "profondità" },
  { match: /^(altezza|height|h[oö]he|hauteur|altura)$/i, abbr: "H", full: "altezza" },
  { match: /^(diametro|diameter|durchmesser|diam[èe]tre|di[áa]metro)$/i, abbr: "Ø", full: "diametro" },
  { match: /^(lunghezza|length|l[aä]nge|longueur|longitud)$/i, abbr: "L", full: "lunghezza" },
];

function abbreviateLabel(label: string): { abbr: string; full: string } {
  const norm = label.trim();
  for (const rule of DIMENSION_ABBREVIATIONS) {
    if (rule.match.test(norm)) return { abbr: rule.abbr, full: rule.full };
  }
  // Fallback: prima lettera maiuscola
  return { abbr: norm.charAt(0).toUpperCase(), full: norm.toLowerCase() };
}

function DimensionsRow({
  labels,
  values,
  blockName,
}: {
  labels: string[];
  values: Record<string, string>;
  blockName: string;
}) {
  const [legendOpen, setLegendOpen] = useState(false);
  const entries = labels
    .filter((l) => values[l])
    .map((l) => ({ ...abbreviateLabel(l), original: l, value: values[l] }));

  if (entries.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-warm-200">
      <div className="text-[12px] uppercase tracking-[0.22em] text-warm-500 mb-3 inline-flex items-center gap-1.5">
        <Ruler size={12} /> Dimensioni
        <span className="normal-case tracking-normal text-warm-400 ml-1 text-[12px]">· {blockName}</span>
        <span className="relative inline-flex">
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            onMouseEnter={() => setLegendOpen(true)}
            onMouseLeave={() => setLegendOpen(false)}
            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-warm-400 hover:text-warm-900"
            aria-label="Legenda dimensioni"
          >
            <Info size={13} />
          </button>
          {legendOpen && (
            <span className="absolute left-5 top-1/2 -translate-y-1/2 z-20 bg-white border border-warm-200 shadow-md rounded px-3 py-2 normal-case tracking-normal text-warm-800 whitespace-nowrap text-[11px] leading-[1.7]">
              <span className="block"><strong className="font-semibold">H</strong> · altezza</span>
              <span className="block"><strong className="font-semibold">W</strong> · larghezza</span>
              <span className="block"><strong className="font-semibold">D</strong> · profondità</span>
              <span className="block"><strong className="font-semibold">SH</strong> · altezza seduta</span>
              <span className="block"><strong className="font-semibold">AH</strong> · altezza bracciolo</span>
              <span className="block"><strong className="font-semibold">SHH</strong> · altezza impilamento</span>
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[14px]">
        {entries.map((e, i) => (
          <span key={e.original} className="inline-flex items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-warm-500">{e.abbr}</span>
            <span className="text-warm-900 font-mono text-[15px]">{e.value}</span>
            {i < entries.length - 1 && <span className="text-warm-300 ml-1">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
