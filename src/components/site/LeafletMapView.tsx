"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { PointOfSale } from "@/types";
import type { MapApi } from "./MapView";

interface Props {
  stores: PointOfSale[];
  onLocationFound?: (address: string) => void;
}

const ITALY_CENTER: [number, number] = [41.9028, 12.4964];

// Fix default marker icon paths for Webpack/Next.
const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function popupHtml(store: PointOfSale): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  return `
    <div style="padding: 4px; max-width: 250px; font-family: sans-serif;">
      <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${esc(store.name)}</h3>
      <p style="font-size: 12px; color: #666; margin-bottom: 2px;">${esc(store.address)}</p>
      ${store.phone ? `<p style="font-size: 12px; color: #666;">${esc(store.phone)}</p>` : ""}
      ${store.email ? `<p style="font-size: 12px; color: #666;">${esc(store.email)}</p>` : ""}
    </div>
  `;
}

const LeafletMapView = forwardRef<MapApi, Props>(function LeafletMapView({ stores, onLocationFound }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: ITALY_CENTER, zoom: 6, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clusterRef.current = (L as any).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });
    map.addLayer(clusterRef.current);

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markersByIdRef.current.clear();
    };
  }, []);

  // Sync markers with stores prop
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;
    cluster.clearLayers();
    markersByIdRef.current.clear();
    const bounds: L.LatLngTuple[] = [];
    stores.forEach((store) => {
      if (typeof store.latitude !== "number" || typeof store.longitude !== "number") return;
      const marker = L.marker([store.latitude, store.longitude], { icon: DEFAULT_ICON, title: store.name });
      marker.bindPopup(popupHtml(store));
      cluster.addLayer(marker);
      markersByIdRef.current.set(store.id, marker);
      bounds.push([store.latitude, store.longitude]);
    });
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }, [stores]);

  useImperativeHandle(ref, () => ({
    panToStore: (store: PointOfSale) => {
      const map = mapRef.current;
      if (!map) return;
      map.setView([store.latitude, store.longitude], 15);
      const m = markersByIdRef.current.get(store.id);
      if (m) m.openPopup();
    },
    searchAddress: async (query: string) => {
      const map = mapRef.current;
      if (!map || !query.trim()) return;
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        const feat = data?.features?.[0];
        if (feat?.geometry?.coordinates) {
          const [lng, lat] = feat.geometry.coordinates as [number, number];
          map.setView([lat, lng], 12);
          const props = feat.properties || {};
          const label = [props.name, props.city, props.country].filter(Boolean).join(", ");
          onLocationFound?.(label || query);
        }
      } catch { /* ignore */ }
    },
  }), [onLocationFound]);

  return <div ref={containerRef} className="w-full h-full min-h-[500px]" style={{ backgroundColor: "#f5f4f2" }} />;
});

export default LeafletMapView;
