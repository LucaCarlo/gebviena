"use client";

import { forwardRef, useEffect, useState, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import GoogleMapView from "./GoogleMapView";
import type { PointOfSale } from "@/types";

const LeafletMapView = dynamic(() => import("./LeafletMapView"), { ssr: false });

export interface MapApi {
  panToStore: (store: PointOfSale) => void;
  searchAddress: (query: string) => void;
}

interface Props {
  stores: PointOfSale[];
  searchInput?: HTMLInputElement | null;
  onLocationFound?: (address: string) => void;
}

interface MapsSettings {
  provider: "google" | "leaflet";
  apiKey: string;
}

const MapView = forwardRef<MapApi, Props>(function MapView({ stores, searchInput, onLocationFound }, ref) {
  const [settings, setSettings] = useState<MapsSettings | null>(null);
  const innerRef = useRef<MapApi | null>(null);

  useEffect(() => {
    fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const d = data?.data || {};
        const provider: "google" | "leaflet" = d.maps_provider === "google" ? "google" : "leaflet";
        const apiKey: string = d.maps_google_api_key || "";
        setSettings({ provider, apiKey });
      })
      .catch(() => setSettings({ provider: "leaflet", apiKey: "" }));
  }, []);

  useImperativeHandle(ref, () => ({
    panToStore: (store) => innerRef.current?.panToStore(store),
    searchAddress: (query) => innerRef.current?.searchAddress(query),
  }), []);

  if (!settings) {
    return <div className="w-full h-full min-h-[500px] flex items-center justify-center" style={{ backgroundColor: "#f5f4f2" }}>
      <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-700 rounded-full animate-spin" />
    </div>;
  }

  if (settings.provider === "google") {
    return <GoogleMapView ref={innerRef} stores={stores} apiKey={settings.apiKey} searchInput={searchInput} onLocationFound={onLocationFound} />;
  }

  return <LeafletMapView ref={innerRef} stores={stores} onLocationFound={onLocationFound} />;
});

export default MapView;
