"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import SeoPanel from "./SeoPanel";
import ImageUploadField from "./ImageUploadField";
import CampaignBlockBuilder from "./campaigns/CampaignBlockBuilder";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { TInput, TRichText } from "./TranslatableField";

interface CampaignFormProps {
  campaignId?: string;
}

interface CategoryOption {
  id: string;
  value: string;
  label: string;
}

export default function CampaignForm({ campaignId }: CampaignFormProps) {
  const router = useRouter();
  const tCtx = useTranslationCtx();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaignCategories, setCampaignCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "",
    subtitle: "",
    year: new Date().getFullYear(),
    description: "",
    imageUrl: "",
    videoUrl: "",
    blocks: "[]",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
  });

  useEffect(() => {
    fetch("/api/categories?contentType=campaigns")
      .then((r) => r.json())
      .then((data) => setCampaignCategories(data.data || []));
  }, []);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    const res = await fetch(`/api/campaigns/${campaignId}`);
    const data = await res.json();
    if (data.success) {
      const c = data.data;
      setForm({
        name: c.name,
        slug: c.slug,
        type: c.type || "",
        subtitle: c.subtitle || "",
        year: c.year || new Date().getFullYear(),
        description: c.description || "",
        imageUrl: c.imageUrl || "",
        videoUrl: c.videoUrl || "",
        blocks: c.blocks || "[]",
        seoTitle: c.seoTitle || "",
        seoDescription: c.seoDescription || "",
        seoKeywords: c.seoKeywords || "[]",
      });
    }
  }, [campaignId]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: campaignId ? prev.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (tCtx?.isTranslating) {
      e.preventDefault();
      const ok = await tCtx.saveTranslation();
      if (ok) router.push("/admin/campaigns");
      return;
    }
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns";
      const method = campaignId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/campaigns");
      } else {
        setError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <TInput
              fieldKey="slug"
              defaultValue={form.slug}
              onDefaultChange={(v) => updateField("slug", v)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Nessuna —</option>
              {campaignCategories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Anno *
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => updateField("year", parseInt(e.target.value) || 0)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Sottotitolo
          </label>
          <TInput
            fieldKey="subtitle"
            defaultValue={form.subtitle}
            onDefaultChange={(v) => updateField("subtitle", v)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione</label>
          <TRichText
            fieldKey="description"
            defaultValue={form.description}
            onDefaultChange={(html) => updateField("description", html)}
          />
        </div>

        {/* Image upload */}
        <ImageUploadField
          label="Immagine"
          value={form.imageUrl}
          onChange={(url) => updateField("imageUrl", url)}
          onRemove={() => updateField("imageUrl", "")}
          purpose="cover"
          folder="campaigns"
          aspectRatio={1}
        />

        <ImageUploadField
          label="Video (caricamento file o URL YouTube)"
          value={form.videoUrl}
          onChange={(url) => updateField("videoUrl", url)}
          onRemove={() => updateField("videoUrl", "")}
          purpose="general"
          folder="campaigns"
          acceptVideo
          helpText="Carica un file video oppure incolla un URL YouTube nel campo URL. Apparirà in cima alla pagina, larghezza uguale al paragrafo centrato."
        />
      </div>

      {/* Sezioni dinamiche */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Sezioni della pagina</h2>
          <p className="text-[11px] text-warm-400 mt-1">Aggiungi e ordina le sezioni come preferisci. Per i video basta un paragrafo sotto.</p>
        </div>
        <CampaignBlockBuilder value={form.blocks} onChange={(json) => updateField("blocks", json)} />
      </div>

      <SeoPanel
        seoTitle={form.seoTitle}
        seoDescription={form.seoDescription}
        seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
        slug={form.slug}
        content={form.description}
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
          {loading ? "Salvataggio..." : campaignId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/campaigns")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
