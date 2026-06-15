"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, EyeOff, ExternalLink, RefreshCw, Pencil, Monitor, Tablet, Smartphone } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

type Tab = "edit" | "preview";
type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_PX: Record<Viewport, number | null> = {
  desktop: null,
  tablet: 820,
  mobile: 390,
};

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [slug, setSlug] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("edit");
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSlug(d.data.slug);
          setIsActive(!!d.data.isActive);
        }
      });
  }, [id]);

  const handleTabChange = (next: Tab) => {
    if (next === "preview" && tab !== "preview") setRefreshKey((k) => k + 1);
    setTab(next);
  };

  const previewUrl = slug ? `/prodotti/${slug}` : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Modifica Prodotto</h1>
          {isActive !== null && (
            <p className="text-sm text-warm-500 mt-1">
              Stato:{" "}
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <Eye size={12} /> Pubblicato
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                  <EyeOff size={12} /> Bozza
                </span>
              )}
            </p>
          )}
        </div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-warm-700 border border-warm-300 rounded-lg hover:bg-warm-50 transition-colors">
            <ExternalLink size={14} /> Apri sul sito
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-warm-200 mb-6">
        <button type="button" onClick={() => handleTabChange("edit")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "edit" ? "border-warm-900 text-warm-900" : "border-transparent text-warm-500 hover:text-warm-900"
          }`}>
          <Pencil size={14} /> Modifica
        </button>
        <button type="button" onClick={() => handleTabChange("preview")} disabled={!previewUrl}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            tab === "preview" ? "border-warm-900 text-warm-900" : "border-transparent text-warm-500 hover:text-warm-900"
          }`}>
          <Eye size={14} /> Anteprima
        </button>
        {tab === "preview" && previewUrl && (
          <div className="ml-auto flex items-center gap-1 mb-2">
            <div className="inline-flex items-center bg-warm-100 rounded p-0.5 mr-2">
              {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
                const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
                return (
                  <button key={v} type="button" onClick={() => setViewport(v)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      viewport === v ? "bg-white text-warm-900 shadow-sm" : "text-warm-500 hover:text-warm-900"
                    }`}>
                    <Icon size={13} />
                    <span className="hidden md:inline">{v === "desktop" ? "Desktop" : v === "tablet" ? "Tablet" : "Mobile"}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-warm-600 hover:text-warm-900 rounded hover:bg-warm-100 transition-colors">
              <RefreshCw size={12} /> Ricarica
            </button>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-warm-600 hover:text-warm-900 rounded hover:bg-warm-100 transition-colors">
              <ExternalLink size={12} /> Nuova scheda
            </a>
          </div>
        )}
      </div>

      <div style={{ display: tab === "edit" ? "block" : "none" }}>
        <EntityTranslationShell entity="product" entityId={id}>
          <ProductForm productId={id} />
        </EntityTranslationShell>
      </div>

      <div style={{ display: tab === "preview" ? "block" : "none" }}>
        {previewUrl ? (
          <div className="border border-warm-200 rounded-lg overflow-hidden bg-warm-100 flex justify-center"
            style={{ padding: VIEWPORT_PX[viewport] ? "20px" : "0" }}>
            <iframe key={refreshKey} src={`${previewUrl}?_t=${refreshKey}`} title="Anteprima prodotto"
              className="block bg-white"
              style={{
                width: VIEWPORT_PX[viewport] ? `${VIEWPORT_PX[viewport]}px` : "100%",
                maxWidth: "100%",
                height: "calc(100vh - 240px)",
                minHeight: "640px",
                border: 0,
                boxShadow: VIEWPORT_PX[viewport] ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
                borderRadius: VIEWPORT_PX[viewport] ? "8px" : "0",
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-warm-400">Caricamento anteprima…</div>
        )}
      </div>
    </div>
  );
}
