"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import Script from "next/script";
import type { PointOfSale } from "@/types";
import type { MapApi } from "./MapView";

interface Props {
  stores: PointOfSale[];
  apiKey: string;
  searchInput?: HTMLInputElement | null;
  onLocationFound?: (address: string) => void;
}

const MAP_CENTER = { lat: 41.9028, lng: 12.4964 };

const GoogleMapView = forwardRef<MapApi, Props>(function GoogleMapView(
  { stores, apiKey, searchInput, onLocationFound },
  ref
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const readyRef = useRef(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || mapInstanceRef.current) return;
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
    readyRef.current = true;

    if (searchInput) {
      const autocomplete = new google.maps.places.Autocomplete(searchInput, { types: ["geocode"] });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(12);
          onLocationFound?.(place.formatted_address || "");
        }
      });
    }
  }, [searchInput, onLocationFound]);

  useEffect(() => {
    if (!mapInstanceRef.current || !readyRef.current) return;
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
      if (stores.length === 1) mapInstanceRef.current.setZoom(14);
    }
  }, [stores]);

  useImperativeHandle(ref, () => ({
    panToStore: (store: PointOfSale) => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.setCenter({ lat: store.latitude, lng: store.longitude });
      mapInstanceRef.current.setZoom(15);
      const idx = stores.findIndex((s) => s.id === store.id);
      if (idx >= 0 && markersRef.current[idx] && infoWindowRef.current) {
        google.maps.event.trigger(markersRef.current[idx], "click");
      }
    },
    searchAddress: (query: string) => {
      if (!query.trim() || !window.google || !mapInstanceRef.current) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          mapInstanceRef.current?.setCenter(loc);
          mapInstanceRef.current?.setZoom(12);
          onLocationFound?.(results[0].formatted_address || query);
        }
      });
    },
  }), [stores, onLocationFound]);

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <div ref={mapRef} className="w-full h-full min-h-[500px]" style={{ backgroundColor: "#f5f4f2" }} />
    </>
  );
});

export default GoogleMapView;
