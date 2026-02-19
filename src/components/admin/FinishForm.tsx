"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { FINISH_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

interface FinishFormProps {
  finishId?: string;
}

export default function FinishForm({ finishId }: FinishFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    code: "",
    category: "LEGNO",
    colorHex: "#000000",
    imageUrl: "",
  });

  const loadFinish = useCallback(async () => {
    if (!finishId) return;
    const res = await fetch(`/api/finishes/${finishId}`);
    const data = await res.json();
    if (data.success) {
      const f = data.data;
      setForm({
        name: f.name,
        slug: f.slug,
        code: f.code || "",
        category: f.category || "LEGNO",
        colorHex: f.colorHex || "#000000",
        imageUrl: f.imageUrl || "",
      });
    }
  }, [finishId]);

  useEffect(() => { loadFinish(); }, [loadFinish]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: finishId ? prev.slug : slugify(name),
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
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

    try {
      const url = finishId ? `/api/finishes/${finishId}` : "/api/finishes";
      const method = finishId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/finishes");
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
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Codice
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Categoria *
            </label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              {FINISH_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Colore
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.colorHex}
                onChange={(e) => updateField("colorHex", e.target.value)}
                className="w-12 h-10 border border-warm-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.colorHex}
                onChange={(e) => updateField("colorHex", e.target.value)}
                className="flex-1 border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                placeholder="#000000"
              />
            </div>
          </div>
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
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : finishId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/finishes")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
