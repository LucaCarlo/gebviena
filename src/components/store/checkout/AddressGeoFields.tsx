"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Province { code: string; name: string; regionCode: string; regionName?: string | null }
interface City { code: string; name: string; caps: string[] }

interface CountryOption { code: string; label: string }

interface Props {
  country: string;
  cityName: string;
  province: string;
  postalCode: string;
  onChange: (patch: { country?: string; city?: string; province?: string; postalCode?: string }) => void;
  t: (it: string, fr: string) => string;
  countryOptions?: CountryOption[];
}

const DEFAULT_COUNTRY_OPTIONS: CountryOption[] = [
  { code: "IT", label: "Italia" },
  { code: "FR", label: "France" },
];

/**
 * Form indirizzo geo-aware. Per i paesi importati nel DB (oggi IT e FR)
 * mostra dropdown a cascata Paese → Provincia → Città → CAP, con CAP
 * auto-compilato se il comune ne ha uno solo, altrimenti dropdown coi CAP
 * disponibili. Per paesi senza dataset, ricade su input testuali.
 *
 * Layout: due righe da 2 colonne. (Paese | Provincia), (Città | CAP).
 */
export default function AddressGeoFields({
  country, cityName, province, postalCode, onChange, t,
  countryOptions = DEFAULT_COUNTRY_OPTIONS,
}: Props) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const lastAutoFilledFor = useRef<string>("");

  useEffect(() => {
    if (!country) { setProvinces([]); return; }
    setLoadingProvinces(true);
    let cancelled = false;
    fetch(`/api/store/public/geo/provinces?country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setProvinces(d.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingProvinces(false); });
    return () => { cancelled = true; };
  }, [country]);

  useEffect(() => {
    if (!province || !country) { setCities([]); return; }
    setLoadingCities(true);
    let cancelled = false;
    fetch(`/api/store/public/geo/cities?country=${encodeURIComponent(country)}&provinceCode=${encodeURIComponent(province)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setCities(d.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [country, province]);

  const currentCity = useMemo(() => cities.find((c) => c.name === cityName), [cities, cityName]);
  const availableCaps = useMemo(() => currentCity?.caps || [], [currentCity]);
  const hasData = provinces.length > 0; // se il paese è stato importato

  // Raggruppa le province per régione (utile soprattutto per FR: l'utente che
  // cerca "Corse" trova il gruppo che contiene "Corse-du-Sud" e "Haute-Corse").
  const provincesGrouped = useMemo(() => {
    const map = new Map<string, Province[]>();
    for (const p of provinces) {
      const key = p.regionName || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [provinces]);

  useEffect(() => {
    if (availableCaps.length === 1) {
      const key = `${country}/${province}/${cityName}`;
      if (lastAutoFilledFor.current !== key && postalCode !== availableCaps[0]) {
        lastAutoFilledFor.current = key;
        onChange({ postalCode: availableCaps[0] });
      }
    }
  }, [availableCaps, postalCode, country, province, cityName, onChange]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("Paese *", "Pays *")}</label>
          <select
            value={country}
            onChange={(e) => onChange({ country: e.target.value, province: "", city: "", postalCode: "" })}
            className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none"
          >
            {countryOptions.map((o) => (
              <option key={o.code} value={o.code}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("Provincia *", "Province *")}</label>
          {hasData ? (
            <select
              value={province}
              disabled={loadingProvinces}
              onChange={(e) => onChange({ province: e.target.value, city: "", postalCode: "" })}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none disabled:bg-warm-50"
            >
              <option value="">{loadingProvinces ? t("Caricamento…", "Chargement…") : "—"}</option>
              {provincesGrouped.map(([regionName, list]) => (
                <optgroup key={regionName} label={regionName}>
                  {list.map((p) => (
                    <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={province}
              onChange={(e) => onChange({ province: e.target.value.toUpperCase() })}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("Città *", "Ville *")}</label>
          {hasData ? (
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
                {!province ? t("Prima la provincia", "D'abord la province") : (loadingCities ? t("Caricamento…", "Chargement…") : "—")}
              </option>
              {cities.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={cityName}
              onChange={(e) => onChange({ city: e.target.value })}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none"
            />
          )}
        </div>
        <div>
          <label className="block text-[13px] text-warm-700 mb-1.5">{t("CAP *", "Code postal *")}</label>
          {hasData && availableCaps.length > 1 ? (
            <select
              value={postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none"
            >
              <option value="">{t("Seleziona il CAP", "Sélectionnez le CP")}</option>
              {availableCaps.map((cap) => (
                <option key={cap} value={cap}>{cap}</option>
              ))}
            </select>
          ) : hasData ? (
            <input
              type="text"
              value={postalCode}
              readOnly
              placeholder={!cityName ? t("Prima la città", "D'abord la ville") : "—"}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-warm-50 focus:border-warm-700 outline-none"
            />
          ) : (
            <input
              type="text"
              value={postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none"
            />
          )}
        </div>
      </div>
    </>
  );
}
