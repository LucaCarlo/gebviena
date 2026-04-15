"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { slugify } from "@/lib/utils";
import SeoPanel from "./SeoPanel";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { TInput, TRichText } from "./TranslatableField";

interface DesignerFormProps {
  designerId?: string;
}

export default function DesignerForm({ designerId }: DesignerFormProps) {
  const router = useRouter();
  const tCtx = useTranslationCtx();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    country: "",
    bio: "",
    imageUrl: "",
    website: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
  });

  const loadDesigner = useCallback(async () => {
    if (!designerId) return;
    const res = await fetch(`/api/designers/${designerId}`);
    const data = await res.json();
    if (data.success) {
      const d = data.data;
      setForm({
        name: d.name,
        slug: d.slug,
        country: d.country || "",
        bio: d.bio || "",
        imageUrl: d.imageUrl || "",
        website: d.website || "",
        seoTitle: d.seoTitle || "",
        seoDescription: d.seoDescription || "",
        seoKeywords: d.seoKeywords || "[]",
      });
    }
  }, [designerId]);

  useEffect(() => { loadDesigner(); }, [loadDesigner]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: designerId ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (value: string) => {
    // Allow letters, numbers, hyphens — normalize as user types
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setForm((prev) => ({ ...prev, slug: normalized }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "cover");
    formData.append("folder", "designers");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, imageUrl: data.data.url }));
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (tCtx?.isTranslating) {
      const ok = await tCtx.saveTranslation();
      setLoading(false);
      if (ok) router.push("/admin/designers");
      return;
    }
    try {
      const url = designerId ? `/api/designers/${designerId}` : "/api/designers";
      const method = designerId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/designers");
      } else {
        setError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Nome *
          </label>
          <TInput
            fieldKey="name"
            defaultValue={form.name}
            onDefaultChange={handleNameChange}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <TInput
              fieldKey="slug"
              defaultValue={form.slug}
              onDefaultChange={handleSlugChange}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
              placeholder="es. nome-cognome"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Paese
            </label>
            <TInput
              fieldKey="country"
              defaultValue={form.country}
              onDefaultChange={(v) => updateField("country", v)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Biografia</label>
          <TRichText
            fieldKey="bio"
            defaultValue={form.bio}
            onDefaultChange={(html) => updateField("bio", html)}
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Immagine
          </label>
          <div className="flex items-start gap-4">
            {form.imageUrl && (
              <div className="w-24 h-24 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                <Image src={form.imageUrl} alt="Preview" fill className="object-cover" sizes="96px" />
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-warm-300 rounded cursor-pointer hover:border-warm-500 transition-colors">
                <Upload size={16} className="text-warm-400" />
                <span className="text-sm text-warm-500">{uploading ? "Caricamento..." : "Carica immagine"}</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
              <p className="text-xs text-warm-400 mt-1">oppure inserisci URL:</p>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                className="w-full mt-1 border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Sito Web
          </label>
          <input
            type="text"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="https://..."
          />
        </div>

      </div>

      <SeoPanel
        seoTitle={form.seoTitle}
        seoDescription={form.seoDescription}
        seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
        slug={form.slug}
        content={form.bio}
        onChange={(field, value) => {
          if (field === "seoKeywords") {
            updateField("seoKeywords", JSON.stringify(value));
          } else {
            updateField(field, value as string);
          }
        }}
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : designerId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/designers")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
