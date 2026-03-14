"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import Link from "next/link";
import { X } from "lucide-react";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import type { PointOfSale } from "@/types";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const DEFAULT_STORE_FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome", type: "text", required: true, enabled: true, order: 0 },
  { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 1 },
  { key: "company", label: "Azienda", type: "text", required: false, enabled: false, order: 2 },
  { key: "phone", label: "Telefono", type: "tel", required: false, enabled: false, order: 3 },
  { key: "contactReason", label: "Motivo del contatto", type: "select", required: false, enabled: false, order: 4 },
  { key: "subject", label: "Oggetto", type: "text", required: false, enabled: false, order: 5 },
  { key: "message", label: "Messaggio", type: "textarea", required: true, enabled: true, order: 6 },
  { key: "acceptPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 7 },
  { key: "subscribeNewsletter", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: false, order: 8 },
];

const MAP_CENTER = { lat: 41.9028, lng: 12.4964 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const DEFAULT_HERO_BG = "/foto-gebvienna/rete-di-vendita.png";

export default function ReteVenditaPage() {
  const [activeTab, setActiveTab] = useState<"STORE" | "AGENT">("STORE");
  const [stores, setStores] = useState<PointOfSale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroBg, setHeroBg] = useState(DEFAULT_HERO_BG);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Contact modal state
  const [contactStore, setContactStore] = useState<PointOfSale | null>(null);
  const [contactForm, setContactForm] = useState<Record<string, string | boolean>>({});
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const [storeFields, setStoreFields] = useState<FieldConfig[] | null>(null);
  const [contactReasons, setContactReasons] = useState<string[]>([]);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    fetch("/api/form-configs/public?type=store_contact")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) setStoreFields(data.data);
      })
      .catch(() => {});
    fetch("/api/contact-reasons/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setContactReasons(data.data);
      })
      .catch(() => {});
    fetch("/api/hero-slides?page=rete-vendita")
      .then((r) => r.json())
      .then((data) => {
        const slides = data.data || [];
        if (slides.length > 0 && slides[0].imageUrl) setHeroBg(slides[0].imageUrl);
      })
      .catch(() => {});
  }, []);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/stores?type=${activeTab}`);
    const data = await res.json();
    const items: PointOfSale[] = data.data || [];
    setStores(items);
    setResultCount(items.length);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: MAP_CENTER,
      zoom: 6,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        searchInputRef.current,
        { types: ["geocode"] }
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(12);
          setSearchLocation(place.formatted_address || "");
        }
      });
    }

    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    stores.forEach((store) => {
      const marker = new google.maps.Marker({
        position: { lat: store.latitude, lng: store.longitude },
        map: mapInstanceRef.current,
        title: store.name,
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="padding: 8px; max-width: 250px; font-family: sans-serif;">
              <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${store.name}</h3>
              <p style="font-size: 12px; color: #666; margin-bottom: 2px;">${store.address}</p>
              ${store.phone ? `<p style="font-size: 12px; color: #666;">${store.phone}</p>` : ""}
              ${store.email ? `<p style="font-size: 12px; color: #666;">${store.email}</p>` : ""}
            </div>
          `);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: store.latitude, lng: store.longitude });
    });

    if (stores.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      if (stores.length === 1) {
        mapInstanceRef.current.setZoom(14);
      }
    }
  }, [stores, mapReady]);

  const handleStoreClick = (store: PointOfSale) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: store.latitude, lng: store.longitude });
      mapInstanceRef.current.setZoom(15);
    }
    const markerIndex = stores.findIndex((s) => s.id === store.id);
    if (markerIndex >= 0 && markersRef.current[markerIndex] && infoWindowRef.current) {
      google.maps.event.trigger(markersRef.current[markerIndex], "click");
    }
  };

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim() || !window.google || !mapInstanceRef.current) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        mapInstanceRef.current?.setCenter(loc);
        mapInstanceRef.current?.setZoom(12);
        setSearchLocation(results[0].formatted_address || searchQuery);
      }
    });
  }, [searchQuery]);

  const openContactModal = (store: PointOfSale) => {
    setContactStore(store);
    const initial: Record<string, string | boolean> = {};
    const fields = (storeFields || DEFAULT_STORE_FIELDS).filter((f) => f.enabled);
    fields.forEach((f) => { initial[f.key] = f.type === "checkbox" ? true : ""; });
    setContactForm(initial);
    setContactSent(false);
    setContactError("");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactStore) return;
    if (!contactForm.acceptPrivacy) {
      setContactError("Devi accettare la privacy policy.");
      return;
    }
    setContactSending(true);
    setContactError("");
    try {
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("store_contact");
      }
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name || "",
          email: contactForm.email || "",
          company: contactForm.company || undefined,
          phone: contactForm.phone || undefined,
          contactReason: contactForm.contactReason || undefined,
          message: contactForm.message || "",
          type: "store_contact",
          storeId: contactStore.id,
          subject: contactForm.subject || `Contatto per ${contactStore.name}`,
          recaptchaToken,
          subscribeNewsletter: !!contactForm.subscribeNewsletter,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContactSent(true);
      } else {
        setContactError(data.error || "Errore durante l'invio.");
      }
    } catch {
      setContactError("Errore di connessione.");
    } finally {
      setContactSending(false);
    }
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initMap}
      />

      {/* ===== HERO — immagine sfondo + titolo + tab + search ===== */}
      <section
        className="relative w-full flex flex-col items-center justify-center py-24 md:py-32 lg:py-40"
        style={{
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#e8e6e3",
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />

        <div className="relative z-10 flex flex-col items-center w-full px-6">
          {/* Title */}
          <h1
            className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-wide mb-8"
            style={{ color: "#000000" }}
          >
            Rete di vendita
          </h1>

          {/* Tabs — under title, above search */}
          <div className="flex justify-center gap-12 mb-10">
            <button
              onClick={() => setActiveTab("STORE")}
              style={{
                color: "#000000",
                borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: activeTab === "STORE" ? "#000000" : "transparent",
              }}
              className="text-sm md:text-base font-medium uppercase tracking-[0.2em] pb-2 transition-colors"
            >
              Negozio
            </button>
            <button
              onClick={() => setActiveTab("AGENT")}
              style={{
                color: "#000000",
                borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: activeTab === "AGENT" ? "#000000" : "transparent",
              }}
              className="text-sm md:text-base font-medium uppercase tracking-[0.2em] pb-2 transition-colors"
            >
              Agenti e Distributori
            </button>
          </div>

          {/* Search */}
          <div className="w-full max-w-xl">
            <label className="block text-sm mb-2" style={{ color: "#000000" }}>
              Trova il punto vendita più vicino a te
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Roma, RM, Italia"
                className="w-full px-5 py-3.5 text-base pr-12 focus:outline-none"
                style={{
                  color: "#000000",
                  border: "1px solid #000000",
                  backgroundColor: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(8px)",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchLocation(""); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "#666" }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="block mx-auto mt-5 text-sm font-medium uppercase tracking-[0.2em] cursor-pointer transition-opacity hover:opacity-60"
              style={{ color: "#000000", background: "none", border: "none" }}
            >
              Avvia la ricerca
            </button>
          </div>
        </div>
      </section>

      {/* Search result count */}
      {searchLocation && (
        <div className="text-center py-8">
          <p className="text-lg md:text-xl font-medium tracking-wide" style={{ color: "#000000" }}>
            CI SONO <strong>{resultCount}</strong> PUNTI VENDITA VICINO A{" "}
            <strong>{searchLocation.toUpperCase()}</strong>
          </p>
        </div>
      )}

      {/* ===== RESULTS: store list + map — full width ===== */}
      <section className="w-full pb-24">
        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden"
          style={{ minHeight: "700px", borderTop: "1px solid #e8e6e3", borderBottom: "1px solid #e8e6e3" }}
        >
          {/* Store list — 40% */}
          <div className="lg:col-span-2 max-h-[700px] overflow-y-auto" style={{ borderRight: "1px solid #e8e6e3" }}>
            {loading ? (
              <div className="p-10 text-center text-base" style={{ color: "#666" }}>Caricamento...</div>
            ) : stores.length === 0 ? (
              <div className="p-10 text-center text-base" style={{ color: "#666" }}>Nessun risultato</div>
            ) : (
              stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className="px-8 py-6 cursor-pointer transition-colors hover:bg-neutral-50"
                  style={{ borderBottom: "1px solid #e8e6e3" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-bold text-base md:text-lg mb-1"
                        style={{ color: "#000000" }}
                      >
                        {store.name}
                      </h3>
                      <p
                        className="text-sm md:text-base leading-relaxed"
                        style={{ color: "#000000" }}
                      >
                        {store.address}
                      </p>
                      {store.phone && (
                        <p
                          className="text-sm md:text-base mt-0.5"
                          style={{ color: "#000000" }}
                        >
                          {store.phone}
                        </p>
                      )}
                      {store.email && (
                        <p
                          className="text-sm md:text-base mt-0.5"
                          style={{ color: "#000000" }}
                        >
                          {store.email}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openContactModal(store); }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#000"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#000"; }}
                      className="flex-shrink-0 self-center text-xs font-medium px-4 py-1.5 uppercase tracking-wider transition-colors"
                      style={{ color: "#000000", border: "1px solid #000000", backgroundColor: "transparent" }}
                    >
                      Contattaci
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Map — 60% */}
          <div ref={mapRef} className="lg:col-span-3 min-h-[500px] lg:min-h-full" style={{ backgroundColor: "#f5f4f2" }} />
        </div>
      </section>

      {/* ===== CONTACT MODAL ===== */}
      {contactStore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setContactStore(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "#000000" }}>
                Contatta {contactStore.name}
              </h3>
              <button onClick={() => setContactStore(null)} style={{ color: "#999" }} className="hover:opacity-60">
                <X size={20} />
              </button>
            </div>

            {contactSent ? (
              <div className="text-center py-8">
                <p className="font-medium" style={{ color: "#000000" }}>Messaggio inviato!</p>
                <p className="text-sm mt-2" style={{ color: "#666" }}>Ti risponderanno il prima possibile.</p>
                <button
                  onClick={() => setContactStore(null)}
                  className="mt-4 text-sm underline"
                  style={{ color: "#000000" }}
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                    {contactError}
                  </div>
                )}
                {(storeFields || DEFAULT_STORE_FIELDS).filter((f) => f.enabled).sort((a, b) => a.order - b.order).map((field) => {
                  if (field.type === "checkbox") {
                    if (field.key === "acceptPrivacy") {
                      return (
                        <label key={field.key} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!contactForm[field.key]}
                            onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.checked })}
                            className="mt-0.5"
                          />
                          <span className="text-xs" style={{ color: "#000000" }}>
                            Accetto la{" "}
                            <Link href="/privacy-policy" className="underline" style={{ color: "#000000" }}>privacy policy</Link> *
                          </span>
                        </label>
                      );
                    }
                    return (
                      <label key={field.key} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!contactForm[field.key]}
                          onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.checked })}
                          className="mt-0.5"
                        />
                        <span className="text-xs" style={{ color: "#000000" }}>{field.label}</span>
                      </label>
                    );
                  }
                  if (field.type === "select") {
                    return (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#000000" }}>
                          {field.label} {field.required && "*"}
                        </label>
                        <select
                          value={(contactForm[field.key] as string) || ""}
                          onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.value })}
                          className="w-full rounded px-3 py-2 text-sm focus:outline-none bg-white"
                          style={{ border: "1px solid #d4d1cc", color: "#000000" }}
                          required={field.required}
                        >
                          <option value="">Seleziona...</option>
                          {contactReasons.map((reason) => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  if (field.type === "textarea") {
                    return (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#000000" }}>
                          {field.label} {field.required && "*"}
                        </label>
                        <textarea
                          value={(contactForm[field.key] as string) || ""}
                          onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.value })}
                          rows={4}
                          className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                          style={{ border: "1px solid #d4d1cc", color: "#000000" }}
                          required={field.required}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#000000" }}>
                        {field.label} {field.required && "*"}
                      </label>
                      <input
                        type={field.type}
                        value={(contactForm[field.key] as string) || ""}
                        onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.value })}
                        className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                        style={{ border: "1px solid #d4d1cc", color: "#000000" }}
                        required={field.required}
                      />
                    </div>
                  );
                })}
                <button
                  type="submit"
                  disabled={contactSending}
                  className="w-full py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {contactSending ? "Invio..." : "Invia messaggio"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
