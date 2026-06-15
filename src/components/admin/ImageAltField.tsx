"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Campo per modificare l'alt text di un'immagine direttamente dove la si usa
 * (es. form prodotto), identificandola tramite URL. Carica l'alt corrente dal
 * media e lo salva al blur su /api/media/alt (PUT). Edita l'alt di default (IT).
 */
export default function ImageAltField({
  url,
  label = "Alt text",
}: {
  url: string;
  label?: string;
}) {
  const [alt, setAlt] = useState("");
  const [initial, setInitial] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "missing">("idle");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url) { setLoaded(true); return; }
    let cancelled = false;
    setLoaded(false);
    fetch("/api/media/alt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const a = (d.success && d.data?.[url]) || "";
        setAlt(a);
        setInitial(a);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [url]);

  const save = async () => {
    if (!url || alt === initial) return;
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/media/alt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, altText: alt }),
      });
      const d = await res.json();
      if (d.success) {
        setInitial(alt);
        if (d.updated === 0) {
          setStatus("missing");
        } else {
          setStatus("saved");
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setStatus("idle"), 2000);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (!url) return null;

  return (
    <div className="mt-2">
      <label className="block text-[10px] font-medium text-warm-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={alt}
          disabled={!loaded}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={save}
          placeholder={loaded ? "Descrizione dell'immagine…" : "Caricamento…"}
          className="w-full border border-warm-300 rounded px-2 py-1 text-xs focus:border-warm-800 focus:outline-none pr-7 disabled:bg-warm-50"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2">
          {saving ? (
            <Loader2 size={12} className="animate-spin text-warm-400" />
          ) : status === "saved" ? (
            <Check size={12} className="text-emerald-600" />
          ) : status === "missing" ? (
            <AlertCircle size={12} className="text-amber-500" />
          ) : null}
        </span>
      </div>
      {status === "missing" && (
        <p className="text-[10px] text-amber-600 mt-0.5">Immagine non trovata nella libreria media: alt non salvato.</p>
      )}
    </div>
  );
}
