"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2, Check, X, ArrowLeft, Plus, Pencil, Trash2, Star, Image as ImageIcon, Calculator, Package, Truck, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import GalleryUploadField from "@/components/admin/GalleryUploadField";
import StoreTranslationsPanel from "@/components/admin/StoreTranslationsPanel";

type ShippingClass = "STANDARD" | "FRAGILE" | "OVERSIZED" | "QUOTE_ONLY";
type AttrType = "MATERIAL" | "FINISH" | "COLOR" | "OTHER";

interface AttrValue {
  id: string;
  type: AttrType;
  code: string;
  hexColor: string | null;
  translations: { languageCode: string; label: string }[];
}

interface VariantAttribute {
  valueId: string;
  value: AttrValue;
}

interface Variant {
  id: string;
  sku: string;
  priceCents: number;
  stockQty: number | null;
  trackStock: boolean;
  volumeM3: string | number;
  weightKg: string | number | null;
  shippingClass: ShippingClass;
  coverImage: string | null;
  galleryImages: string | null;
  isDefault: boolean;
  isPublished: boolean;
  sortOrder: number;
  dimensionBlockId: string | null;
  dimensionValues: string | null;
  attributes: VariantAttribute[];
  translations: { languageCode: string; name: string | null; description: string | null }[];
}

interface DimensionBlock {
  id: string;
  name: string;
  labels: string;
  isActive: boolean;
  sortOrder: number;
}

interface StoreProductDetail {
  id: string;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
  coverImage: string | null;
  galleryImages: string | null;
  excludedCatalogImages: string | null;
  storeCategoryId: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    coverImage: string | null;
    imageUrl: string;
    galleryImages: string | null;
    translations: { languageCode: string; name: string; description: string | null }[];
  };
  storeCategory: { id: string; slug: string; translations: { languageCode: string; name: string }[] } | null;
  translations: {
    languageCode: string;
    name: string | null;
    slug: string;
    shortDescription: string | null;
    marketingDescription: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
  }[];
  variants: Variant[];
}

interface Category {
  id: string;
  slug: string;
  parentId: string | null;
  translations: { languageCode: string; name: string }[];
}

type Tab = "general" | "variants";

const SHIPPING_CLASSES: { value: ShippingClass; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "FRAGILE", label: "Fragile" },
  { value: "OVERSIZED", label: "Fuori misura" },
  { value: "QUOTE_ONLY", label: "Solo su preventivo" },
];

function parseGallery(s: string | null): string[] {
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string");
  } catch {
    // fallback: newline-separated
  }
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

function stringifyGallery(arr: string[]): string | null {
  const clean = arr.map((x) => x.trim()).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}

export default function StoreProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [sp, setSp] = useState<StoreProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<AttrValue[]>([]);
  const [dimensionBlocks, setDimensionBlocks] = useState<DimensionBlock[]>([]);
  const [tab, setTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [spRes, catRes, attrRes, blockRes] = await Promise.all([
      fetch(`/api/store/products/${id}`).then((r) => r.json()),
      fetch(`/api/store/categories`).then((r) => r.json()),
      fetch(`/api/store/attributes`).then((r) => r.json()),
      fetch(`/api/dimension-blocks`).then((r) => r.json()),
    ]);
    if (spRes.success) setSp(spRes.data);
    if (catRes.success) setCategories(catRes.data);
    if (attrRes.success) setAttributes(attrRes.data);
    if (blockRes.success) setDimensionBlocks(blockRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveProduct = async (patch: Partial<StoreProductDetail> & {
    translations?: StoreProductDetail["translations"];
  }) => {
    if (!sp) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/store/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        setSp(data.data);
        showToast("Salvato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="text-center py-24 text-warm-500">
        Prodotto non trovato.{" "}
        <Link href="/admin/store/products" className="text-warm-900 underline">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const productLabel = sp.product.translations.find((t) => t.languageCode === "it")?.name || sp.product.name;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/store/products" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna alla lista
        </Link>
      </div>

      <header className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">{productLabel}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-warm-500 font-mono">{sp.product.slug}</span>
            <span className="text-warm-300">·</span>
            <span className="text-warm-500">{sp.product.category}</span>
            <span className="text-warm-300">·</span>
            <span className={sp.isPublished ? "text-emerald-600" : "text-warm-500"}>
              {sp.isPublished ? "Pubblicato" : "Bozza"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sp.isPublished ? (
            <button
              onClick={() => saveProduct({ isPublished: false })}
              disabled={saving}
              className="px-4 py-2 bg-warm-100 text-warm-700 rounded-lg hover:bg-warm-200 text-sm"
            >
              Metti in bozza
            </button>
          ) : (
            <button
              onClick={() => saveProduct({ isPublished: true })}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              Pubblica
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-warm-200 mb-6">
        {[
          { k: "general", l: "Generale", I: Package },
          { k: "variants", l: `Varianti (${sp.variants.length})`, I: Truck },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as Tab)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px inline-flex items-center gap-2 ${
              tab === t.k
                ? "border-warm-900 text-warm-900 font-medium"
                : "border-transparent text-warm-500 hover:text-warm-700"
            }`}
          >
            <t.I size={14} />
            {t.l}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-6">
          <section>
            <SectionHeader title="Dati generali" subtitle="Categorizzazione e pubblicazione" />
            <GeneralTab sp={sp} categories={categories} onSave={saveProduct} saving={saving} />
          </section>

          <section>
            <SectionHeader title="Immagini" subtitle="Cover, gallery dello shop e selezione dello slideshow catalogo" />
            <ImagesTab sp={sp} onSave={saveProduct} saving={saving} />
          </section>

          <section>
            <SectionHeader title="Contenuti multilingua" subtitle="Seleziona la lingua, compila o traduci con AI, salva." />
            <div className="max-w-3xl">
              <StoreTranslationsPanel entity="store-product" entityId={sp.id} onSaved={fetchAll} />
            </div>
          </section>
        </div>
      )}
      {tab === "variants" && (
        <VariantsTab
          sp={sp}
          attributes={attributes}
          dimensionBlocks={dimensionBlocks}
          onRefresh={fetchAll}
          showToast={showToast}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
            toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  General tab                                                               */
/* -------------------------------------------------------------------------- */

function GeneralTab({
  sp, categories, onSave, saving,
}: {
  sp: StoreProductDetail;
  categories: Category[];
  onSave: (patch: Partial<StoreProductDetail>) => void;
  saving: boolean;
}) {
  const [storeCategoryId, setStoreCategoryId] = useState(sp.storeCategoryId || "");
  const [sortOrder, setSortOrder] = useState(sp.sortOrder);

  const catPickerItems = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    const byParent = new Map<string | null, Category[]>();
    for (const c of categories) {
      const list = byParent.get(c.parentId) || [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    const walk = (pid: string | null, depth: number) => {
      for (const c of byParent.get(pid) || []) {
        out.push({
          id: c.id,
          label: "—".repeat(depth) + " " + (c.translations.find((t) => t.languageCode === "it")?.name || c.slug),
        });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [categories]);

  return (
    <div className="max-w-2xl bg-white rounded-lg border border-warm-200 p-6 space-y-4">
      <div>
        <label className="block text-xs font-medium text-warm-600 mb-1">Categoria shop</label>
        <select
          value={storeCategoryId}
          onChange={(e) => setStoreCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="">— Nessuna —</option>
          {catPickerItems.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <div className="text-xs text-warm-500 mt-1">
          Le categorie shop sono indipendenti dalle categorie del catalogo ({sp.product.category}).
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">Ordine visualizzazione</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-warm-100 flex justify-end">
        <button
          onClick={() => onSave({ storeCategoryId: storeCategoryId || null, sortOrder } as unknown as Partial<StoreProductDetail>)}
          disabled={saving}
          className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm"
        >
          {saving ? "Salvataggio..." : "Salva"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Images tab                                                                */
/* -------------------------------------------------------------------------- */

function ImagesTab({
  sp, onSave, saving,
}: {
  sp: StoreProductDetail;
  onSave: (patch: Partial<StoreProductDetail>) => void;
  saving: boolean;
}) {
  const [cover, setCover] = useState(sp.coverImage || "");
  const [gallery, setGallery] = useState<string[]>(parseGallery(sp.galleryImages));

  // Gallery catalogo: esclusioni (array di URL nascosti)
  const catalogGallery = parseGallery(sp.product.galleryImages);
  const initialExcluded = parseGallery(sp.excludedCatalogImages);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(initialExcluded));

  const toggleExclude = (url: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const save = () => {
    onSave({
      coverImage: cover || null,
      galleryImages: stringifyGallery(gallery),
      excludedCatalogImages: stringifyGallery(Array.from(excluded)),
    } as unknown as Partial<StoreProductDetail>);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <h2 className="font-medium text-warm-900 mb-1">Cover Store</h2>
        <p className="text-sm text-warm-500 mb-4">
          Immagine principale visualizzata nella lista prodotti e nell&apos;hero della pagina dettaglio shop.
        </p>
        <ImageUploadField
          label=""
          value={cover}
          onChange={setCover}
          onRemove={() => setCover("")}
          folder="store-products"
          purpose="cover"
          recommendedSize="1200 × 900 px (4:3)"
          aspectRatio={4 / 3}
        />
      </section>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <h2 className="font-medium text-warm-900 mb-1">Gallery Store</h2>
        <p className="text-sm text-warm-500 mb-4">
          Immagini aggiuntive per la pagina dettaglio shop. Carica da PC o scegli dalla media library.
        </p>
        <GalleryUploadField
          label=""
          value={gallery}
          onChange={setGallery}
          folder="store-products"
          helpText="Trascina più immagini in una volta o scegli dalla libreria. Riordina trascinandole."
        />
      </section>

      {catalogGallery.length > 0 && (
        <section className="bg-white rounded-lg border border-warm-200 p-6">
          <h2 className="font-medium text-warm-900 mb-1">Slideshow del catalogo (mostrato in fondo)</h2>
          <p className="text-sm text-warm-500 mb-4">
            Queste immagini arrivano dal Product catalogo e vengono mostrate come sezione &quot;estetica&quot; in fondo alla pagina shop.
            <strong className="text-warm-700"> Puoi nascondere quelle che non vuoi mostrare nello store</strong> (cliccando l&apos;occhio).
          </p>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {catalogGallery.map((u, i) => {
              const isHidden = excluded.has(u);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => toggleExclude(u)}
                  title={isHidden ? "Nascosta — click per ripristinare" : "Visibile — click per nascondere"}
                  className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                    isHidden ? "border-red-300 opacity-40" : "border-transparent hover:border-warm-400"
                  }`}
                >
                  <div
                    className="w-full h-full bg-warm-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${u})` }}
                  />
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                    isHidden ? "opacity-100" : "opacity-0 hover:opacity-100"
                  }`}>
                    {isHidden ? <EyeOff size={18} className="text-white" /> : <Eye size={18} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-warm-500 mt-3">
            {excluded.size > 0 ? `${excluded.size} immagine/i nascoste` : "Tutte visibili"}
            {` · Totale catalogo: ${catalogGallery.length}`}
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm"
        >
          {saving ? "Salvataggio..." : "Salva immagini"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variants tab                                                              */
/* -------------------------------------------------------------------------- */

function VariantsTab({
  sp, attributes, dimensionBlocks, onRefresh, showToast,
}: {
  sp: StoreProductDetail;
  attributes: AttrValue[];
  dimensionBlocks: DimensionBlock[];
  onRefresh: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [editing, setEditing] = useState<Variant | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveVariant = async (variant: Variant, isNew: boolean) => {
    setSaving(true);
    const url = isNew
      ? `/api/store/products/${sp.id}/variants`
      : `/api/store/products/${sp.id}/variants/${variant.id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: variant.sku,
          priceCents: variant.priceCents,
          stockQty: variant.trackStock ? variant.stockQty : null,
          trackStock: variant.trackStock,
          volumeM3: Number(variant.volumeM3),
          weightKg: variant.weightKg === null || variant.weightKg === "" ? null : Number(variant.weightKg),
          shippingClass: variant.shippingClass,
          coverImage: variant.coverImage,
          galleryImages: variant.galleryImages,
          isDefault: variant.isDefault,
          isPublished: variant.isPublished,
          sortOrder: variant.sortOrder,
          attributeValueIds: variant.attributes.map((a) => a.valueId),
          dimensionBlockId: variant.dimensionBlockId,
          dimensionValues: variant.dimensionValues,
          translations: variant.translations,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isNew ? "Variante creata" : "Variante aggiornata", true);
        setEditing(null);
        setCreating(false);
        onRefresh();
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vid: string) => {
    if (!confirm("Cancellare questa variante?")) return;
    const res = await fetch(`/api/store/products/${sp.id}/variants/${vid}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Variante cancellata", true);
      onRefresh();
    } else {
      showToast(data.error || "Errore", false);
    }
  };

  const emptyVariant: Variant = {
    id: "",
    sku: "",
    priceCents: 0,
    stockQty: null,
    trackStock: false,
    volumeM3: 0,
    weightKg: null,
    shippingClass: "STANDARD",
    coverImage: null,
    galleryImages: null,
    isDefault: sp.variants.length === 0,
    isPublished: false,
    sortOrder: sp.variants.length,
    dimensionBlockId: null,
    dimensionValues: null,
    attributes: [],
    translations: [],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-warm-500">
          {sp.variants.length} variant{sp.variants.length === 1 ? "e" : "i"}. Ogni variante rappresenta una combinazione di materiale/finitura/colore con SKU, prezzo, stock e volume propri.
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 text-sm"
        >
          <Plus size={14} /> Nuova variante
        </button>
      </div>

      {sp.variants.length === 0 ? (
        <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessuna variante. Aggiungine almeno una per poter vendere il prodotto.
        </div>
      ) : (
        <div className="space-y-3">
          {sp.variants.map((v) => (
            <VariantCard
              key={v.id}
              variant={v}
              onEdit={() => setEditing({ ...v })}
              onDelete={() => handleDelete(v.id)}
            />
          ))}
        </div>
      )}

      {creating && (
        <VariantModal
          title="Nuova variante"
          initial={emptyVariant}
          attributes={attributes}
          dimensionBlocks={dimensionBlocks}
          onSave={(v) => handleSaveVariant(v, true)}
          onCancel={() => setCreating(false)}
          saving={saving}
        />
      )}

      {editing && (
        <VariantModal
          title="Modifica variante"
          initial={editing}
          attributes={attributes}
          dimensionBlocks={dimensionBlocks}
          onSave={(v) => handleSaveVariant(v, false)}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function VariantCard({ variant: v, onEdit, onDelete }: { variant: Variant; onEdit: () => void; onDelete: () => void }) {
  const priceFmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v.priceCents / 100);
  return (
    <div className="bg-white rounded-lg border border-warm-200 p-4 flex gap-4 items-start">
      {v.coverImage ? (
        <div
          className="w-20 h-20 rounded bg-warm-100 bg-cover bg-center flex-shrink-0"
          style={{ backgroundImage: `url(${v.coverImage})` }}
        />
      ) : (
        <div className="w-20 h-20 rounded bg-warm-100 flex-shrink-0 flex items-center justify-center text-warm-300">
          <ImageIcon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {v.isDefault && <Star size={14} className="text-amber-500 fill-amber-500" />}
          <span className="font-mono text-xs text-warm-500">{v.sku}</span>
          {v.isPublished ? (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Pubblicata</span>
          ) : (
            <span className="text-xs text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded">Bozza</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {v.attributes.map((a) => {
            const label = a.value.translations.find((t) => t.languageCode === "it")?.label || a.value.code;
            return (
              <span
                key={a.valueId}
                className="inline-flex items-center gap-1 text-xs bg-warm-100 px-2 py-0.5 rounded"
              >
                {a.value.type === "COLOR" && a.value.hexColor && (
                  <span className="w-3 h-3 rounded border border-warm-300" style={{ backgroundColor: a.value.hexColor }} />
                )}
                <span className="text-warm-400 text-[10px] uppercase">{a.value.type.toLowerCase()}:</span>
                <span className="text-warm-800">{label}</span>
              </span>
            );
          })}
          {v.attributes.length === 0 && <span className="text-xs text-warm-400 italic">nessun attributo</span>}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-warm-600">
          <span><strong className="text-warm-900">{priceFmt}</strong></span>
          <span>Stock: {v.trackStock ? (v.stockQty ?? 0) : "∞"}</span>
          <span>Vol: {Number(v.volumeM3).toFixed(3)} m³</span>
          {v.weightKg !== null && <span>Peso: {Number(v.weightKg).toFixed(1)} kg</span>}
          <span className="text-warm-500">{SHIPPING_CLASSES.find((s) => s.value === v.shippingClass)?.label}</span>
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-2 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 rounded">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function VariantModal({
  title, initial, attributes, dimensionBlocks, onSave, onCancel, saving,
}: {
  title: string;
  initial: Variant;
  attributes: AttrValue[];
  dimensionBlocks: DimensionBlock[];
  onSave: (v: Variant) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState<Variant>(initial);
  const update = (patch: Partial<Variant>) => setV((prev) => ({ ...prev, ...patch }));

  // Dimensioni: il blocco selezionato e i valori correnti
  const selectedBlock = dimensionBlocks.find((b) => b.id === v.dimensionBlockId) || null;
  const dimensionLabels: string[] = (() => {
    if (!selectedBlock) return [];
    try {
      const p = JSON.parse(selectedBlock.labels);
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
    } catch { return []; }
  })();
  const dimensionValues: Record<string, string> = (() => {
    if (!v.dimensionValues) return {};
    try {
      const p = JSON.parse(v.dimensionValues);
      return p && typeof p === "object" ? (p as Record<string, string>) : {};
    } catch { return {}; }
  })();
  const setDimensionValue = (label: string, value: string) => {
    const next = { ...dimensionValues, [label]: value };
    for (const k of Object.keys(next)) if (!next[k]) delete next[k];
    update({ dimensionValues: Object.keys(next).length ? JSON.stringify(next) : null });
  };
  const changeBlock = (blockId: string) => {
    update({ dimensionBlockId: blockId || null, dimensionValues: null });
  };

  const toggleAttr = (val: AttrValue) => {
    const existing = v.attributes.find((a) => a.valueId === val.id);
    if (existing) {
      update({ attributes: v.attributes.filter((a) => a.valueId !== val.id) });
    } else {
      // Rimuove eventuali altri valori dello stesso tipo (una variante = un valore per tipo)
      const filtered = v.attributes.filter((a) => a.value.type !== val.type);
      update({ attributes: [...filtered, { valueId: val.id, value: val }] });
    }
  };

  const byType = useMemo(() => {
    const out: Record<AttrType, AttrValue[]> = { MATERIAL: [], FINISH: [], COLOR: [], OTHER: [] };
    for (const a of attributes) if (a) out[a.type].push(a);
    return out;
  }, [attributes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-warm-900">{title}</h2>
          <button onClick={onCancel} className="text-warm-400 hover:text-warm-900">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">SKU</label>
              <input
                value={v.sku}
                onChange={(e) => update({ sku: e.target.value })}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Prezzo (€)</label>
              <input
                type="number"
                step="0.01"
                value={(v.priceCents / 100).toFixed(2)}
                onChange={(e) => update({ priceCents: Math.round(Number(e.target.value) * 100) || 0 })}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="bg-warm-50 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-warm-800">
              <input
                type="checkbox"
                checked={v.trackStock}
                onChange={(e) => update({ trackStock: e.target.checked, stockQty: e.target.checked ? (v.stockQty ?? 0) : null })}
              />
              Traccia stock <span className="text-warm-500 text-xs">(se disattivo = disponibilità illimitata ∞)</span>
            </label>
            {v.trackStock && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-warm-600">Quantità:</span>
                <input
                  type="number"
                  min={0}
                  value={v.stockQty ?? 0}
                  onChange={(e) => update({ stockQty: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
                  className="w-32 px-3 py-1.5 border border-warm-200 rounded-lg text-sm bg-white"
                />
              </div>
            )}
          </div>

          {/* Spedizione */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-warm-600 uppercase tracking-wider">Spedizione</div>
            <VolumeCalculator volumeM3={Number(v.volumeM3)} onChange={(m3) => update({ volumeM3: m3 })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Peso (kg, opz.)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={v.weightKg === null || v.weightKg === undefined ? "" : String(v.weightKg)}
                  onChange={(e) => update({ weightKg: e.target.value === "" ? null : Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Classe spedizione</label>
                <select
                  value={v.shippingClass}
                  onChange={(e) => update({ shippingClass: e.target.value as ShippingClass })}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
                >
                  {SHIPPING_CLASSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Attributi */}
          <div>
            <div className="text-xs font-medium text-warm-600 uppercase tracking-wider mb-2">Attributi variante</div>
            {(["MATERIAL", "FINISH", "COLOR", "OTHER"] as AttrType[]).map((type) => {
              const vals = byType[type];
              if (vals.length === 0) return null;
              const selected = v.attributes.find((a) => a.value.type === type);
              return (
                <div key={type} className="mb-3">
                  <div className="text-xs text-warm-500 mb-1 capitalize">
                    {type === "MATERIAL" ? "Materiale" : type === "FINISH" ? "Finitura" : type === "COLOR" ? "Colore" : "Altro"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vals.map((val) => {
                      const isSel = selected?.valueId === val.id;
                      const label = val.translations.find((t) => t.languageCode === "it")?.label || val.code;
                      return (
                        <button
                          key={val.id}
                          onClick={() => toggleAttr(val)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                            isSel
                              ? "bg-warm-900 text-white border-warm-900"
                              : "bg-white border-warm-200 text-warm-700 hover:border-warm-400"
                          }`}
                        >
                          {type === "COLOR" && val.hexColor && (
                            <span className="w-3 h-3 rounded border border-warm-300" style={{ backgroundColor: val.hexColor }} />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {attributes.length === 0 && (
              <div className="text-sm text-warm-500 bg-warm-50 border border-warm-200 rounded-lg p-3">
                Non hai ancora creato attributi.{" "}
                <Link href="/admin/store/attributes" className="underline text-warm-900">Creane</Link>{" "}
                prima di associarli alle varianti.
              </div>
            )}
          </div>

          {/* Dimensioni (gruppo DimensionBlock + valori) */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-warm-600 uppercase tracking-wider">Dimensioni (opz.)</div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Gruppo dimensioni</label>
              <select
                value={v.dimensionBlockId ?? ""}
                onChange={(e) => changeBlock(e.target.value)}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
              >
                <option value="">— Nessuno —</option>
                {dimensionBlocks.filter((b) => b.isActive).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-warm-500 mt-1">
                Riusa i gruppi dimensioni del catalogo principale. Gestiscili da{" "}
                <Link href="/admin/products/dimensions" className="underline">Prodotti → Dimensioni</Link>.
              </p>
            </div>
            {selectedBlock && dimensionLabels.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-warm-50 rounded-lg p-3">
                {dimensionLabels.map((lab) => (
                  <div key={lab}>
                    <label className="block text-[11px] font-medium text-warm-600 mb-1">{lab}</label>
                    <input
                      value={dimensionValues[lab] || ""}
                      onChange={(e) => setDimensionValue(lab, e.target.value)}
                      placeholder="es. 60 cm"
                      className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-sm bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Immagini */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-warm-600 uppercase tracking-wider">Foto della variante (opz.)</div>
            <p className="text-xs text-warm-500">
              Questa foto sostituisce la cover del prodotto quando il cliente seleziona questa variante.
            </p>
            <ImageUploadField
              label=""
              value={v.coverImage || ""}
              onChange={(url) => update({ coverImage: url || null })}
              onRemove={() => update({ coverImage: null })}
              folder="store-variants"
              purpose="variant-cover"
              recommendedSize="1200 × 900 px (4:3)"
              aspectRatio={4 / 3}
            />
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-warm-100">
            <label className="flex items-center gap-2 text-sm text-warm-700">
              <input
                type="checkbox"
                checked={v.isDefault}
                onChange={(e) => update({ isDefault: e.target.checked })}
              />
              Variante di default
            </label>
            <label className="flex items-center gap-2 text-sm text-warm-700">
              <input
                type="checkbox"
                checked={v.isPublished}
                onChange={(e) => update({ isPublished: e.target.checked })}
              />
              Pubblicata
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900">
            Annulla
          </button>
          <button
            onClick={() => onSave(v)}
            disabled={saving || !v.sku || Number(v.volumeM3) < 0}
            className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Salva variante
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Volume calculator widget                                                  */
/* -------------------------------------------------------------------------- */

function VolumeCalculator({ volumeM3, onChange }: { volumeM3: number; onChange: (m3: number) => void }) {
  const [mode, setMode] = useState<"direct" | "dimensions">(volumeM3 > 0 ? "direct" : "dimensions");
  const [L, setL] = useState<number>(0);
  const [W, setW] = useState<number>(0);
  const [H, setH] = useState<number>(0);

  const computed = L > 0 && W > 0 && H > 0 ? Math.round(((L * W * H) / 1_000_000) * 1000) / 1000 : 0;

  useEffect(() => {
    if (mode === "dimensions" && computed > 0) onChange(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, computed]);

  const displayed = mode === "dimensions" && computed > 0 ? computed : Number(volumeM3);

  return (
    <div className="border border-warm-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-warm-600">Volume (m³)</label>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={`px-2 py-1 rounded ${mode === "direct" ? "bg-warm-900 text-white" : "bg-warm-100 text-warm-600"}`}
          >
            Inserisci m³
          </button>
          <button
            type="button"
            onClick={() => setMode("dimensions")}
            className={`px-2 py-1 rounded inline-flex items-center gap-1 ${mode === "dimensions" ? "bg-warm-900 text-white" : "bg-warm-100 text-warm-600"}`}
          >
            <Calculator size={12} /> Calcola da L×W×H
          </button>
        </div>
      </div>

      {mode === "direct" ? (
        <input
          type="number"
          step="0.001"
          min={0}
          value={Number(volumeM3)}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-warm-500 mb-0.5">L (cm)</label>
              <input type="number" min={0} value={L || ""} onChange={(e) => setL(Number(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-warm-200 rounded text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-warm-500 mb-0.5">W (cm)</label>
              <input type="number" min={0} value={W || ""} onChange={(e) => setW(Number(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-warm-200 rounded text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-warm-500 mb-0.5">H (cm)</label>
              <input type="number" min={0} value={H || ""} onChange={(e) => setH(Number(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-warm-200 rounded text-sm" />
            </div>
          </div>
          <div className="text-xs text-warm-500 mt-2">
            = <strong className="text-warm-800 font-mono">{displayed.toFixed(3)} m³</strong>
            {computed > 0 && <span className="ml-2 text-emerald-600">(applicato)</span>}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-warm-900">{title}</h2>
      {subtitle && <p className="text-sm text-warm-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
