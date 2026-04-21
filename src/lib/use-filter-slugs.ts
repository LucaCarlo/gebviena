"use client";

import { useEffect, useState } from "react";

export const FILTER_TYPES = ["products", "projects", "news", "campaigns"] as const;
export type FilterType = (typeof FILTER_TYPES)[number];
export type FilterLang = "it" | "en" | "de" | "fr" | "es";

export interface FilterEntry {
  value: string;
  slugs: Record<FilterLang, string>;
}

type Store = Record<FilterType, FilterEntry[]>;

let cache: Store | null = null;
let inflight: Promise<Store> | null = null;
const subscribers = new Set<() => void>();

const LANGS: FilterLang[] = ["it", "en", "de", "fr", "es"];
function isLang(x: string): x is FilterLang {
  return (LANGS as string[]).includes(x);
}

export function getFilterSlugsCache(): Store | null {
  return cache;
}

export async function ensureFilterSlugsLoaded(): Promise<Store> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/filter-slugs");
      const json = await res.json();
      cache = (json?.data as Store) || { products: [], projects: [], news: [], campaigns: [] };
    } catch {
      cache = { products: [], projects: [], news: [], campaigns: [] };
    }
    subscribers.forEach((fn) => fn());
    inflight = null;
    return cache!;
  })();
  return inflight;
}

export function slugToValue(type: FilterType, slug: string, lang: string): string | null {
  if (!cache || !slug || !isLang(lang)) return null;
  const entry = cache[type].find((e) => e.slugs[lang] === slug);
  return entry?.value || null;
}

export function valueToSlug(type: FilterType, value: string, lang: string): string | null {
  if (!cache || !value || !isLang(lang)) return null;
  const entry = cache[type].find((e) => e.value === value);
  return entry?.slugs[lang] || null;
}

export function translateFilterSlug(
  type: FilterType,
  slug: string,
  srcLang: string,
  dstLang: string,
): string | null {
  const value = slugToValue(type, slug, srcLang);
  if (!value) return null;
  return valueToSlug(type, value, dstLang);
}

/**
 * Hook that triggers the one-time fetch and re-renders the caller when the
 * cache becomes available. Safe to call from multiple components; the fetch
 * is deduped at the module level.
 */
export function useFilterSlugs() {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!cache) ensureFilterSlugsLoaded();
    const onUpdate = () => setTick((n) => n + 1);
    subscribers.add(onUpdate);
    return () => {
      subscribers.delete(onUpdate);
    };
  }, []);
  return {
    ready: !!cache,
    slugToValue,
    valueToSlug,
    translateFilterSlug,
  };
}
