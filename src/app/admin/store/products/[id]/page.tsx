"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2, Check, X, ArrowLeft, Plus, Pencil, Trash2, Star, Image as ImageIcon, Calculator, Globe, Package, Truck, AlertCircle,
} from "lucide-react";

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
  attributes: VariantAttribute[];
  translations: { languageCode: string; name: string | null; description: string | null }[];
}

interface StoreProductDetail {
  id: string;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
  coverImage: string | null;
  galleryImages: string | null;
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

interface Language {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

interface Category {
  id: string;
  slug: string;
  parentId: string | null;
  translations: { languageCode: string; name: string }[];
}

type Tab = "general" | "images" | "translations" | "variants";

const SHIPPING_CLASSES: { value: ShippingClass; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "FRAGILE", label: "Fragile" },
  { value: "OVERSIZED", label: "Fuori misura" },
  { value: "QUOTE_ONLY", label: "Solo su preventivo" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
  const [languages, setLanguages] = useState<Language[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<AttrValue[]>([]);
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
    const [spRes, langRes, catRes, attrRes] = await Promise.all([
      fetch(`/api/store/products/${id}`).then((r) => r.json()),
      fetch(`/api/languages`).then((r) => r.json()),
      fetch(`/api/store/categories`).then((r) => r.json()),
      fetch(`/api/store/attributes`).then((r) => r.json()),
    ]);
    if (spRes.success) setSp(spRes.data);
    if (langRes.success) setLanguages(langRes.data);
    if (catRes.success) setCategories(catRes.data);
    if (attrRes.success) setAttributes(attrRes.data);
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
          { k: "images", l: "Immagini", I: ImageIcon },
          { k: "translations", l: "Traduzioni", I: Globe },
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
        <GeneralTab sp={sp} categories={categories} onSave={saveProduct} saving={saving} />
      )}
      {tab === "images" && (
        <ImagesTab sp={sp} onSave={saveProduct} saving={saving} />
      )}
      {tab === "translations" && (
        <TranslationsTab sp={sp} languages={languages} onSave={saveProduct} saving={saving} />
      )}
      {tab === "variants" && (
        <VariantsTab
          sp={sp}
          attributes={attributes}
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
  const [newImg, setNewImg] = useState("");

  const addImg = () => {
    const u = newImg.trim();
    if (!u) return;
    setGallery((g) => [...g, u]);
    setNewImg("");
  };

  const save = () => {
    onSave({
      coverImage: cover || null,
      galleryImages: stringifyGallery(gallery),
    } as unknown as Partial<StoreProductDetail>);
  };

  const catalogGallery = parseGallery(sp.product.galleryImages);

  return (
    <div className="max-w-3xl space-y-6">
      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <h2 className="font-medium text-warm-900 mb-4">Cover Store</h2>
        <p className="text-sm text-warm-500 mb-3">
          Immagine principale visualizzata nella lista prodotti e nell&apos;hero della pagina dettaglio shop.
        </p>
        <input
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          placeholder="https://... (URL immagine)"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
        />
        {cover && (
          <div
            className="mt-3 w-full max-w-sm aspect-[4/3] rounded border border-warm-200 bg-warm-50 bg-cover bg-center"
            style={{ backgroundImage: `url(${cover})` }}
          />
        )}
      </section>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <h2 className="font-medium text-warm-900 mb-4">Gallery Store</h2>
        <p className="text-sm text-warm-500 mb-3">
          Immagini aggiuntive per la pagina dettaglio shop. Carica le immagini in /admin/media e incolla qui gli URL.
        </p>

        <div className="space-y-2 mb-4">
          {gallery.map((u, i) => (
            <div key={i} className="flex items-center gap-2 bg-warm-50 rounded-lg p-2">
              <div
                className="w-14 h-14 rounded bg-warm-100 bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${u})` }}
              />
              <input
                value={u}
                onChange={(e) => setGallery((g) => g.map((x, idx) => (idx === i ? e.target.value : x)))}
                className="flex-1 px-3 py-1.5 border border-warm-200 rounded text-sm bg-white font-mono"
              />
              <button
                onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newImg}
            onChange={(e) => setNewImg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addImg()}
            placeholder="https://... aggiungi URL"
            className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
          <button onClick={addImg} className="px-4 py-2 bg-warm-100 text-warm-800 rounded-lg hover:bg-warm-200 text-sm">
            <Plus size={14} />
          </button>
        </div>
      </section>

      {catalogGallery.length > 0 && (
        <section className="bg-warm-50 rounded-lg border border-warm-200 p-6">
          <h2 className="font-medium text-warm-900 mb-1">Slideshow del catalogo (mostrato in fondo)</h2>
          <p className="text-sm text-warm-500 mb-3">
            Queste immagini vengono dalle gallery del Product catalogo e verranno mostrate come sezione &quot;estetica&quot; in fondo alla pagina shop. Non editabili qui.
          </p>
          <div className="flex gap-2 flex-wrap">
            {catalogGallery.map((u, i) => (
              <div
                key={i}
                className="w-20 h-20 rounded bg-warm-200 bg-cover bg-center"
                style={{ backgroundImage: `url(${u})` }}
              />
            ))}
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
/*  Translations tab                                                          */
/* -------------------------------------------------------------------------- */

function TranslationsTab({
  sp, languages, onSave, saving,
}: {
  sp: StoreProductDetail;
  languages: Language[];
  onSave: (patch: { translations: StoreProductDetail["translations"] }) => void;
  saving: boolean;
}) {
  const ensure = () => {
    const map = new Map(sp.translations.map((t) => [t.languageCode, t]));
    return languages.map((l) => {
      const existing = map.get(l.code);
      const catalogName = sp.product.translations.find((t) => t.languageCode === l.code)?.name || "";
      return existing ?? {
        languageCode: l.code,
        name: null,
        slug: slugify(catalogName || sp.product.slug),
        shortDescription: null,
        marketingDescription: null,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
      };
    });
  };
  const [rows, setRows] = useState<StoreProductDetail["translations"]>(ensure());

  const update = (code: string, patch: Partial<StoreProductDetail["translations"][number]>) => {
    setRows((rs) => rs.map((r) => (r.languageCode === code ? { ...r, ...patch } : r)));
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="text-sm text-warm-500 bg-warm-50 border border-warm-200 rounded-lg p-3">
        Se lasci il <strong>nome vuoto</strong>, il prodotto mostrerà il nome dal catalogo Thonet ({sp.product.name}).
        Lo <strong>slug</strong> invece è obbligatorio per l&apos;URL.
      </div>

      {rows.map((r) => {
        const lang = languages.find((l) => l.code === r.languageCode);
        return (
          <section key={r.languageCode} className="bg-white rounded-lg border border-warm-200 p-6 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-warm-100">
              <Globe size={14} className="text-warm-500" />
              <span className="font-medium text-warm-900 uppercase">{r.languageCode}</span>
              <span className="text-warm-500 text-sm">· {lang?.name}</span>
              {lang?.isDefault && <span className="text-xs text-warm-400">(default)</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Nome commerciale (opz.)</label>
                <input
                  value={r.name || ""}
                  onChange={(e) => update(r.languageCode, { name: e.target.value || null })}
                  placeholder={sp.product.translations.find((t) => t.languageCode === r.languageCode)?.name || sp.product.name}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Slug URL</label>
                <input
                  value={r.slug}
                  onChange={(e) => update(r.languageCode, { slug: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Descrizione breve</label>
              <textarea
                value={r.shortDescription || ""}
                onChange={(e) => update(r.languageCode, { shortDescription: e.target.value || null })}
                rows={2}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Descrizione estesa (marketing)</label>
              <textarea
                value={r.marketingDescription || ""}
                onChange={(e) => update(r.languageCode, { marketingDescription: e.target.value || null })}
                rows={4}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
              />
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-warm-500 hover:text-warm-900">SEO</summary>
              <div className="mt-3 space-y-3">
                <input
                  value={r.seoTitle || ""}
                  onChange={(e) => update(r.languageCode, { seoTitle: e.target.value || null })}
                  placeholder="SEO title"
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
                <textarea
                  value={r.seoDescription || ""}
                  onChange={(e) => update(r.languageCode, { seoDescription: e.target.value || null })}
                  placeholder="SEO meta description"
                  rows={2}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
                <input
                  value={r.seoKeywords || ""}
                  onChange={(e) => update(r.languageCode, { seoKeywords: e.target.value || null })}
                  placeholder="keyword1, keyword2"
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
            </details>
          </section>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={() => onSave({ translations: rows })}
          disabled={saving}
          className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm"
        >
          {saving ? "Salvataggio..." : "Salva traduzioni"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variants tab                                                              */
/* -------------------------------------------------------------------------- */

function VariantsTab({
  sp, attributes, onRefresh, showToast,
}: {
  sp: StoreProductDetail;
  attributes: AttrValue[];
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
  title, initial, attributes, onSave, onCancel, saving,
}: {
  title: string;
  initial: Variant;
  attributes: AttrValue[];
  onSave: (v: Variant) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState<Variant>(initial);
  const update = (patch: Partial<Variant>) => setV((prev) => ({ ...prev, ...patch }));

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

          {/* Immagini */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-warm-600 uppercase tracking-wider">Immagini variante (opz.)</div>
            <input
              value={v.coverImage || ""}
              onChange={(e) => update({ coverImage: e.target.value || null })}
              placeholder="URL cover variante"
              className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
            />
            {v.coverImage && (
              <div
                className="w-40 h-32 rounded border border-warm-200 bg-warm-50 bg-cover bg-center"
                style={{ backgroundImage: `url(${v.coverImage})` }}
              />
            )}
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

  useEffect(() => {
    if (mode === "dimensions" && L > 0 && W > 0 && H > 0) {
      const m3 = (L * W * H) / 1_000_000; // cm³ → m³
      onChange(Math.round(m3 * 1000) / 1000);
    }
  }, [mode, L, W, H, onChange]);

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
            = <strong className="text-warm-800 font-mono">{Number(volumeM3).toFixed(3)} m³</strong>
          </div>
        </>
      )}
    </div>
  );
}
