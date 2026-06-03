"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Province { code: string; name: string; regionCode: string }
interface City { code: string; name: string; caps: string[] }

interface ItGeoFieldsProps {
  cityName: string;
  province: string;       // codice ISO (es. "MI")
  postalCode: string;
  onChange: (patch: { city?: string; province?: string; postalCode?: string }) => void;
  t: (it: string, fr: string) => string;
}

/**
 * Provincia → Città → CAP a cascata, alimentati dal DB.
 * - Provincia: 107 voci.
 * - Città: filtrate per provincia.
 * - CAP: auto-selezionato se il comune ha un solo CAP; dropdown se ne ha più.
 *
 * Visualizzazione cascata: cambiando provincia, città e CAP vengono resettati;
 * cambiando città, CAP viene reimpostato (auto se unico).
 */
export default function ItGeoFields({ cityName, province, postalCode, onChange, t }: ItGeoFieldsProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const lastAutoFilledFor = useRef<string>("");

  useEffect(() => {
    fetch("/api/store/public/geo/provinces?country=IT")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProvinces(d.data); })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!province) { setCities([]); return; }
    setLoadingCities(true);
    let cancelled = false;
    fetch(`/api/store/public/geo/cities?provinceCode=${encodeURIComponent(province)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setCities(d.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [province]);

  const currentCity = useMemo(() => cities.find((c) => c.name === cityName), [cities, cityName]);
  const availableCaps = useMemo(() => currentCity?.caps || [], [currentCity]);

  // Auto-fill CAP quando il comune ha un solo CAP e non è già impostato.
  useEffect(() => {
    if (availableCaps.length === 1) {
      const key = `${province}/${cityName}`;
      if (lastAutoFilledFor.current !== key && postalCode !== availableCaps[0]) {
        lastAutoFilledFor.current = key;
        onChange({ postalCode: availableCaps[0] });
      }
    }
  }, [availableCaps, postalCode, province, cityName, onChange]);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("Provincia *", "Province *")}</label>
          <select
            value={province}
            onChange={(e) => onChange({ province: e.target.value, city: "", postalCode: "" })}
            className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none"
          >
            <option value="">—</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("Città *", "Ville *")}</label>
          <select
            value={cityName}
            disabled={!province || loadingCities}
            onChange={(e) => {
              const newCity = e.target.value;
              const c = cities.find((x) => x.name === newCity);
              const newCap = c?.caps?.length === 1 ? c.caps[0] : "";
              onChange({ city: newCity, postalCode: newCap });
            }}
            className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none disabled:bg-warm-50"
          >
            <option value="">
              {!province ? t("Prima seleziona la provincia", "Sélectionnez d'abord la province") : (loadingCities ? t("Caricamento…", "Chargement…") : t("Seleziona una città", "Sélectionnez une ville"))}
            </option>
            {cities.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[13px] text-warm-700 mb-1.5">{t("CAP *", "Code postal *")}</label>
        {availableCaps.length > 1 ? (
          <select
            value={postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            className="w-full max-w-xs border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none"
          >
            <option value="">{t("Seleziona il CAP", "Sélectionnez le CP")}</option>
            {availableCaps.map((cap) => (
              <option key={cap} value={cap}>{cap}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={postalCode}
            readOnly
            placeholder={!cityName ? t("Seleziona prima una città", "Sélectionnez d'abord une ville") : "—"}
            className="w-full max-w-xs border border-warm-300 rounded px-3 py-2.5 text-sm bg-warm-50 focus:border-warm-700 outline-none"
          />
        )}
      </div>
    </>
  );
}
