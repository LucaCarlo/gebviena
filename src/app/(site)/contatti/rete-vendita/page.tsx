"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Script from "next/script";
import type { PointOfSale } from "@/types";

const MAP_CENTER = { lat: 41.9028, lng: 12.4964 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function ReteVenditaPage() {
  const [activeTab, setActiveTab] = useState<"STORE" | "AGENT">("STORE");
  const [stores, setStores] = useState<PointOfSale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Update markers when stores change or map becomes ready
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

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initMap}
      />

      {/* Hero */}
      <section className="relative h-[40vh] flex items-center justify-center bg-warm-900">
        <Image
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop"
          alt="Rete di vendita"
          fill
          className="object-cover opacity-30"
        />
        <h1 className="relative font-serif text-4xl md:text-5xl text-white">
          Rete di vendita
        </h1>
      </section>

      {/* Search Section */}
      <section className="luxury-container py-12">
        <div className="flex justify-center gap-8 mb-8">
          <button
            onClick={() => setActiveTab("STORE")}
            className={`text-sm font-medium uppercase tracking-[0.2em] pb-2 border-b-2 transition-colors ${
              activeTab === "STORE"
                ? "text-warm-800 border-warm-800"
                : "text-warm-400 border-transparent hover:text-warm-600"
            }`}
          >
            Negozio
          </button>
          <button
            onClick={() => setActiveTab("AGENT")}
            className={`text-sm font-medium uppercase tracking-[0.2em] pb-2 border-b-2 transition-colors ${
              activeTab === "AGENT"
                ? "text-warm-800 border-warm-800"
                : "text-warm-400 border-transparent hover:text-warm-600"
            }`}
          >
            Agenti e Distributori
          </button>
        </div>

        <div className="max-w-lg mx-auto mb-4">
          <label className="block text-xs text-warm-500 mb-1">
            Trova il punto vendita più vicino a te
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Roma, RM, Italia"
              className="w-full border border-warm-300 rounded px-4 py-3 text-sm text-warm-800 pr-10 focus:border-warm-800 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchLocation(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-center mt-3 text-xs font-medium uppercase tracking-[0.2em] text-warm-500">
            Avvia la ricerca
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="luxury-container pb-20">
        {searchLocation && (
          <div className="text-center mb-8">
            <p className="text-sm text-warm-600">
              CI SONO <strong>{resultCount}</strong> PUNTI VENDITA VICINO A{" "}
              <strong>{searchLocation.toUpperCase()}</strong>
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSearchLocation(""); }}
              className="text-xs text-warm-500 hover:text-warm-800 mt-1 uppercase tracking-wider"
            >
              Esegui una nuova ricerca
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 border border-warm-200 rounded-lg overflow-hidden min-h-[500px]">
          <div className="lg:col-span-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-warm-400">Caricamento...</div>
            ) : stores.length === 0 ? (
              <div className="p-8 text-center text-warm-400">Nessun risultato</div>
            ) : (
              stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className="p-6 border-b border-warm-200 cursor-pointer hover:bg-warm-50 transition-colors"
                >
                  <h3 className="font-bold text-sm text-warm-800 mb-2">{store.name}</h3>
                  <p className="text-xs text-warm-600 leading-relaxed">{store.address}</p>
                  {store.phone && <p className="text-xs text-warm-600 mt-1">{store.phone}</p>}
                  {store.email && (
                    <a
                      href={`mailto:${store.email}`}
                      className="text-xs text-brand-500 hover:underline mt-1 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {store.email}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
          <div ref={mapRef} className="lg:col-span-3 min-h-[400px] lg:min-h-full bg-warm-100" />
        </div>
      </section>
    </>
  );
}
