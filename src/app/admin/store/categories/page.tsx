"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle, ChevronRight, ChevronDown, Image as ImageIcon } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface CatTranslation {
  id?: string;
  languageCode: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  isPublished?: boolean;
}

interface Category {
  id: string;
  parentId: string | null;
  slug: string;
  coverImage: string | null;
  sortOrder: number;
  isPublished: boolean;
  translations: CatTranslation[];
  _count: { products: number; children: number };
}

interface Language {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function StoreCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [catRes, langRes] = await Promise.all([
      fetch("/api/store/categories").then((r) => r.json()),
      fetch("/api/languages").then((r) => r.json()),
    ]);
    if (catRes.success) setCats(catRes.data);
    if (langRes.success) setLanguages(langRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const byParent = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    for (const c of cats) {
      const list = map.get(c.parentId) || [];
      list.push(c);
      map.set(c.parentId, list);
    }
    map.forEach((list) => list.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder));
    return map;
  }, [cats]);

  const emptyTranslations = (): CatTranslation[] =>
    languages.map((l) => ({ languageCode: l.code, name: "", slug: "" }));

  const ensureTranslations = (existing: CatTranslation[]): CatTranslation[] => {
    const map = new Map(existing.map((t) => [t.languageCode, t]));
    return languages.map((l) => map.get(l.code) ?? { languageCode: l.code, name: "", slug: "" });
  };

  const startNew = (parentId: string | null) => {
    setNewParentId(parentId);
    setShowNew(true);
  };

  const renderNode = (cat: Category, depth = 0): React.ReactNode => {
    const children = byParent.get(cat.id) || [];
    const isOpen = expanded[cat.id] ?? depth < 1;
    const defLang = languages.find((l) => l.isDefault)?.code || "it";
    const defLabel = cat.translations.find((t) => t.languageCode === defLang)?.name || cat.slug;
    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 py-2 pr-2 hover:bg-warm-50 rounded"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <button
            onClick={() => setExpanded((e) => ({ ...e, [cat.id]: !isOpen }))}
            className={`text-warm-400 ${children.length === 0 ? "invisible" : ""}`}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {cat.coverImage ? (
            <div className="w-8 h-8 rounded bg-warm-100 bg-cover bg-center" style={{ backgroundImage: `url(${cat.coverImage})` }} />
          ) : (
            <div className="w-8 h-8 rounded bg-warm-100 flex items-center justify-center text-warm-300">
              <ImageIcon size={14} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-warm-900 truncate">{defLabel}</span>
              <span className="text-xs text-warm-400 font-mono truncate">/{cat.slug}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-warm-500 mt-0.5">
              <span>{cat._count.products} prodotti</span>
              <span>·</span>
              <span>{cat._count.children} sotto-cat.</span>
              <span>·</span>
              <span className={cat.isPublished ? "text-emerald-600" : "text-warm-400"}>
                {cat.isPublished ? "Pubblicata" : "Bozza"}
              </span>
            </div>
          </div>
          <button
            onClick={() => startNew(cat.id)}
            className="p-1.5 text-warm-400 hover:text-warm-900 hover:bg-white rounded"
            title="Aggiungi sottocategoria"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setEditing({ ...cat, translations: ensureTranslations(cat.translations) })}
            className="p-1.5 text-warm-500 hover:text-warm-900 hover:bg-white rounded"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(cat)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {isOpen && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const handleSave = async (data: Category, isNew: boolean) => {
    setSaving(true);
    try {
      const url = isNew ? "/api/store/categories" : `/api/store/categories/${data.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: data.slug,
          parentId: data.parentId,
          coverImage: data.coverImage,
          sortOrder: data.sortOrder,
          isPublished: data.isPublished,
          translations: data.translations.filter((t) => t.name.trim()),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(isNew ? "Creata" : "Aggiornata", true);
        setEditing(null);
        setShowNew(false);
        await fetchAll();
      } else {
        showToast(json.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Cancellare "${cat.slug}"?`)) return;
    const res = await fetch(`/api/store/categories/${cat.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      showToast("Cancellata", true);
      await fetchAll();
    } else {
      showToast(json.error || "Errore", false);
    }
  };

  const roots = byParent.get(null) || [];

  const allCatsForPicker = useMemo(() => {
    const defLang = languages.find((l) => l.isDefault)?.code || "it";
    const out: { id: string; label: string; depth: number }[] = [];
    const walk = (pid: string | null, depth: number) => {
      const list = byParent.get(pid) || [];
      for (const c of list) {
        const name = c.translations.find((t) => t.languageCode === defLang)?.name || c.slug;
        out.push({ id: c.id, label: "—".repeat(depth) + " " + name, depth });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [byParent, languages]);

  return (
    <div className="max-w-5xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">Categorie Store</h1>
          <p className="text-sm text-warm-500 mt-1">
            Categorie visualizzate nel menu dello shop. Struttura ad albero.
          </p>
        </div>
        <button
          onClick={() => startNew(null)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 text-sm"
        >
          <Plus size={16} /> Nuova categoria
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : roots.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessuna categoria. Clicca &quot;Nuova categoria&quot;.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 p-2">
          {roots.map((c) => renderNode(c, 0))}
        </div>
      )}

      {showNew && (
        <CategoryModal
          title="Nuova categoria"
          initial={{
            id: "",
            parentId: newParentId,
            slug: "",
            coverImage: null,
            sortOrder: 0,
            isPublished: false,
            translations: emptyTranslations(),
            _count: { products: 0, children: 0 },
          }}
          languages={languages}
          allCategories={allCatsForPicker}
          onSave={(data) => handleSave(data, true)}
          onCancel={() => setShowNew(false)}
          saving={saving}
        />
      )}

      {editing && (
        <CategoryModal
          title="Modifica categoria"
          initial={editing}
          languages={languages}
          allCategories={allCatsForPicker.filter((c) => c.id !== editing.id)}
          onSave={(data) => handleSave(data, false)}
          onCancel={() => setEditing(null)}
          saving={saving}
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

function CategoryModal({
  title,
  initial,
  languages,
  allCategories,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  initial: Category;
  languages: Language[];
  allCategories: { id: string; label: string }[];
  onSave: (data: Category) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [data, setData] = useState<Category>(initial);

  const defLang = languages.find((l) => l.isDefault)?.code || "it";
  const defName = data.translations.find((t) => t.languageCode === defLang)?.name || "";

  const update = (patch: Partial<Category>) => setData((d) => ({ ...d, ...patch }));
  const updateTranslation = (code: string, patch: Partial<CatTranslation>) => {
    const existing = data.translations.find((t) => t.languageCode === code);
    const next = existing
      ? data.translations.map((t) => (t.languageCode === code ? { ...t, ...patch } : t))
      : [...data.translations, { languageCode: code, name: "", slug: "", ...patch }];
    update({ translations: next });
  };

  // Auto-populate slug when editing default-lang name if slug empty
  const handleDefaultNameChange = (name: string) => {
    updateTranslation(defLang, { name });
    if (!data.slug) update({ slug: slugify(name) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
          <h2 className="font-semibold text-warm-900">{title}</h2>
          <button onClick={onCancel} className="text-warm-400 hover:text-warm-900">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Categoria parent</label>
              <select
                value={data.parentId || ""}
                onChange={(e) => update({ parentId: e.target.value || null })}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
              >
                <option value="">— Nessuno (root) —</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">
                Slug globale <span className="text-warm-400 font-normal">(URL nel sito default)</span>
              </label>
              <input
                value={data.slug}
                onChange={(e) => update({ slug: e.target.value.toLowerCase() })}
                placeholder="es. sedie"
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <ImageUploadField
              label="Immagine cover categoria"
              value={data.coverImage || ""}
              onChange={(url) => update({ coverImage: url || null })}
              onRemove={() => update({ coverImage: null })}
              folder="store-categories"
              purpose="category-cover"
              recommendedSize="1200 × 900 px (4:3)"
              aspectRatio={4 / 3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Ordine</label>
              <input
                type="number"
                value={data.sortOrder}
                onChange={(e) => update({ sortOrder: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-warm-700 mt-5">
                <input
                  type="checkbox"
                  checked={data.isPublished}
                  onChange={(e) => update({ isPublished: e.target.checked })}
                />
                Pubblicata (visibile nel menu shop)
              </label>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-warm-600 mb-2">Traduzioni</div>
            <div className="space-y-3">
              {languages.map((l) => {
                const t = data.translations.find((tr) => tr.languageCode === l.code) || {
                  languageCode: l.code,
                  name: "",
                  slug: "",
                };
                const isDef = l.code === defLang;
                return (
                  <div key={l.code} className="bg-warm-50 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wider text-warm-500">
                      {l.code} · {l.name}
                      {isDef && <span className="ml-2 text-warm-400 normal-case text-[10px]">(default)</span>}
                    </div>
                    <input
                      value={t.name}
                      onChange={(e) =>
                        isDef ? handleDefaultNameChange(e.target.value) : updateTranslation(l.code, { name: e.target.value })
                      }
                      placeholder={`Nome in ${l.name}`}
                      className="w-full px-3 py-1.5 border border-warm-200 rounded text-sm bg-white"
                    />
                    <input
                      value={t.slug}
                      onChange={(e) => updateTranslation(l.code, { slug: e.target.value.toLowerCase() })}
                      placeholder={`slug-${l.code}`}
                      className="w-full px-3 py-1.5 border border-warm-200 rounded text-sm font-mono bg-white"
                    />
                  </div>
                );
              })}
            </div>
            {defName && !data.slug && (
              <div className="text-xs text-warm-500 mt-2">Slug globale si auto-popolerà: <code>{slugify(defName)}</code></div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900">
            Annulla
          </button>
          <button
            onClick={() => onSave(data)}
            disabled={saving}
            className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
