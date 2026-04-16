"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import type { PointOfSale } from "@/types";

interface StoreFormProps {
  storeId?: string;
  defaultType?: "STORE" | "AGENT";
  backUrl: string;
}

export default function StoreForm({ storeId, defaultType = "STORE", backUrl }: StoreFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: defaultType,
    address: "",
    city: "",
    country: "Italia",
    phone: "",
    email: "",
    website: "",
    latitude: 41.9028,
    longitude: 12.4964,
  });

  const loadStore = useCallback(async () => {
    if (!storeId) return;
    const res = await fetch(`/api/stores/${storeId}`);
    const data = await res.json();
    if (data.success) {
      const s: PointOfSale = data.data;
      setForm({
        name: s.name,
        type: s.type,
        address: s.address,
        city: s.city,
        country: s.country,
        phone: s.phone || "",
        email: s.email || "",
        website: s.website || "",
        latitude: s.latitude,
        longitude: s.longitude,
      });
    }
  }, [storeId]);

  useEffect(() => { loadStore(); }, [loadStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = storeId ? `/api/stores/${storeId}` : "/api/stores";
      const method = storeId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push(backUrl);
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

  /* ── Geocoding via Photon (gratis, no key) ──────────────── */
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const geocode = async () => {
    const query = [form.address, form.city, form.country].filter(Boolean).join(", ").trim();
    if (!query) {
      setGeocodeMsg({ type: "error", text: "Compila prima indirizzo, città e paese." });
      return;
    }
    setGeocoding(true);
    setGeocodeMsg(null);
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const feat = data?.features?.[0];
      if (!feat?.geometry?.coordinates) {
        setGeocodeMsg({ type: "error", text: "Indirizzo non trovato. Verifica i dati e riprova, oppure inserisci le coordinate manualmente." });
        return;
      }
      const [lng, lat] = feat.geometry.coordinates as [number, number];
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      const props = feat.properties || {};
      const found = [props.name, props.street, props.city, props.country].filter(Boolean).join(", ");
      setGeocodeMsg({ type: "success", text: `Coordinate aggiornate per: ${found}` });
    } catch {
      setGeocodeMsg({ type: "error", text: "Errore di connessione al servizio di geocoding." });
    } finally {
      setGeocoding(false);
    }
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
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Indirizzo *
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Città *
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Paese *
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Telefono
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
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
            />
          </div>
        </div>

        <div className="border-t border-warm-200 pt-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Coordinate sulla mappa</h3>
              <p className="text-[11px] text-warm-400 mt-1">
                Premi &quot;Calcola coordinate&quot; per ricavarle automaticamente da indirizzo + città + paese (servizio gratuito Photon/OpenStreetMap). Se l&apos;esito non è preciso puoi sempre correggerle a mano.
              </p>
            </div>
            <button
              type="button"
              onClick={geocode}
              disabled={geocoding}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded disabled:opacity-50"
            >
              {geocoding ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              {geocoding ? "Calcolo in corso..." : "Calcola coordinate"}
            </button>
          </div>

          {geocodeMsg && (
            <div className={`text-xs px-3 py-2 rounded mb-3 ${
              geocodeMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
              geocodeMsg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" :
              "bg-blue-50 border border-blue-200 text-blue-800"
            }`}>
              {geocodeMsg.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Latitudine *
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => updateField("latitude", parseFloat(e.target.value))}
                className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Longitudine *
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => updateField("longitude", parseFloat(e.target.value))}
                className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                required
              />
            </div>
          </div>

          <div className="mt-3 text-center">
            <a
              href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=17/${form.latitude}/${form.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-warm-500 hover:underline"
            >
              Verifica posizione su OpenStreetMap →
            </a>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : storeId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backUrl)}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
