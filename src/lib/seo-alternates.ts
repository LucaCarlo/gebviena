import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { localizePath, DEFAULT_LANG } from "./path-segments";

interface ActiveLanguage {
  code: string;
  urlPrefix: string | null;
  isDefault: boolean;
}

let cache: { langs: ActiveLanguage[]; ts: number } | null = null;
const TTL = 5 * 60_000;

async function getActiveLanguages(): Promise<ActiveLanguage[]> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL) return cache.langs;
  const langs = await prisma.language.findMany({
    where: { isActive: true },
    select: { code: true, urlPrefix: true, isDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  cache = { langs, ts: now };
  return langs;
}

function getOrigin(): string {
  try {
    const h = headers();
    const proto = h.get("x-forwarded-proto") || "http";
    const host = h.get("host") || "localhost:3002";
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

/**
 * Build hreflang alternates for a canonical IT path.
 * For per-entity slug pages, pass `slugByLang` map: { it: "sedia-14", en: "chair-14" }.
 * The trailing slug is appended after segment translation.
 */
export async function buildAlternates(
  itPath: string,
  slugByLang?: Record<string, string>
): Promise<Metadata["alternates"]> {
  const langs = await getActiveLanguages();
  const origin = getOrigin();
  const languages: Record<string, string> = {};

  for (const l of langs) {
    let path: string;
    if (slugByLang && slugByLang[l.code]) {
      // strip the slug placeholder (assumed last segment) and append translated slug
      const base = itPath.replace(/\/[^/]+$/, "");
      const localized = localizePath(base, l.code, l.urlPrefix);
      path = `${localized === "/" ? "" : localized}/${slugByLang[l.code]}`;
    } else {
      path = localizePath(itPath, l.code, l.urlPrefix);
    }
    languages[l.code] = origin + path;
  }
  // x-default points to the IT canonical
  const def = langs.find((l) => l.isDefault);
  if (def) languages["x-default"] = languages[def.code];

  // canonical = current lang URL
  return { languages, canonical: languages[DEFAULT_LANG] };
}
