import { NextResponse, type NextRequest } from "next/server";
import { translateSegmentsBackward } from "@/lib/path-segments";

const KNOWN_PREFIXES = ["en", "de", "fr", "es"];
const DEFAULT_LANG = "it";

interface RedirectRow {
  fromPath: string;
  toPath: string;
  statusCode: number;
}

// In-memory cache of enabled redirects (refreshed every 60s).
let redirectCache: { rows: RedirectRow[]; ts: number } | null = null;
const REDIRECT_TTL = 60_000;

async function getRedirects(origin: string): Promise<RedirectRow[]> {
  const now = Date.now();
  if (redirectCache && now - redirectCache.ts < REDIRECT_TTL) return redirectCache.rows;
  try {
    const res = await fetch(`${origin}/api/redirects`, { next: { revalidate: 60 } });
    if (!res.ok) return redirectCache?.rows || [];
    const json = await res.json();
    const rows = json?.data || [];
    redirectCache = { rows, ts: now };
    return rows;
  } catch {
    return redirectCache?.rows || [];
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase();
  const isStoreHost = host.startsWith("store.");

  // Passa-through per asset statici e API
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Separazione host-based:
  // - /admin su host store → redirect al main host (la dashboard è solo sul main)
  // - /store/* su host main → redirect al host store (shop pubblico solo su store.*)
  if (pathname.startsWith("/admin")) {
    if (isStoreHost) {
      const mainHost = host.replace(/^store\./, "");
      const target = new URL(pathname + req.nextUrl.search, req.url);
      target.host = mainHost;
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  if (!isStoreHost && pathname === "/store") {
    const target = new URL("/" + req.nextUrl.search, req.url);
    target.host = "store." + host;
    return NextResponse.redirect(target);
  }
  if (!isStoreHost && pathname.startsWith("/store/")) {
    const target = new URL(pathname.replace(/^\/store/, "") + req.nextUrl.search, req.url);
    target.host = "store." + host;
    return NextResponse.redirect(target);
  }

  // 1. Apply admin-defined redirects first (matched against canonical path)
  const origin = req.nextUrl.origin;
  const redirects = await getRedirects(origin);
  if (redirects.length > 0) {
    // Match against pathname (with and without trailing slash).
    // If a fromPath includes a query string, also match pathname+search so
    // admin-defined redirects like "/fr/produits/?_tipologia=outdoor-fr" work.
    const search = req.nextUrl.search;
    const pathNoSlash = pathname.replace(/\/$/, "");
    const pathWithSlash = pathname.endsWith("/") ? pathname : pathname + "/";
    const candidates = [pathname, pathNoSlash, pathWithSlash];
    if (search) {
      candidates.push(pathname + search, pathNoSlash + search, pathWithSlash + search);
    }
    const match = redirects.find((r) => candidates.includes(r.fromPath));
    if (match) {
      const target = /^https?:\/\//.test(match.toPath)
        ? match.toPath
        : new URL(match.toPath, req.url).toString();
      // Fire-and-forget hits update (don't await — keep redirect fast)
      fetch(`${origin}/api/redirects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath: match.fromPath }),
      }).catch(() => {});
      return NextResponse.redirect(target, match.statusCode);
    }
  }

  // 2. Lang prefix detection + backward segment translation
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // La lingua è determinata dal prefisso nell'URL (/fr, /en, …).
  // Se l'URL NON ha prefisso ma esiste il cookie "gtv_lang" (impostato dal
  // language switcher quando l'utente sceglie esplicitamente una lingua),
  // facciamo redirect a /{lang}/... così i link hardcoded in italiano
  // (es. <Link href="/">) non resettano la lingua attiva.
  // Cookie="it" → nessun redirect (l'utente ha esplicitamente scelto IT).
  let lang = DEFAULT_LANG;
  let rest = segments;

  if (first && KNOWN_PREFIXES.includes(first)) {
    lang = first;
    rest = segments.slice(1);
    rest = translateSegmentsBackward(rest, lang);
  } else if (!isStoreHost) {
    // Solo sul main host. Sullo store il routing è host-based e non vogliamo
    // forzare prefissi sull'URL della vetrina.
    const cookieLang = req.cookies.get("gtv_lang")?.value?.toLowerCase() || "";
    if (KNOWN_PREFIXES.includes(cookieLang)) {
      const target = req.nextUrl.clone();
      target.pathname = `/${cookieLang}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(target);
    }
  }

  const strippedPath = rest.length ? "/" + rest.join("/") : "/";
  // Su host store, inoltriamo internamente a /store/<path>
  const routedPath = isStoreHost
    ? (strippedPath === "/" ? "/store" : "/store" + strippedPath)
    : strippedPath;

  const url = req.nextUrl.clone();
  url.pathname = routedPath;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-gtv-lang", lang);
  requestHeaders.set("x-gtv-canonical-path", strippedPath);
  const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  res.headers.set("x-gtv-lang", lang);

  // Cookie "gtv_shop_seed": stabile per sessione browser, usato dall'API
  // /api/store/public/products quando la strategia random è "per-session" per
  // generare uno shuffle deterministico. Va settato qui in middleware perché
  // la pagina /store usa un fetch server-side (Server Component) che non
  // propagherebbe Set-Cookie al browser. Lo settiamo solo su host store.
  if (isStoreHost && !req.cookies.get("gtv_shop_seed")) {
    // 8 byte (16 hex char) sufficienti come seed; uso randomUUID per evitare
    // di pesare l'Edge runtime con node:crypto.
    const seed = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    res.cookies.set({
      name: "gtv_shop_seed",
      value: seed,
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
      sameSite: "lax",
    });
  }
  return res;
}

export const config = {
  // Admin incluso perché lo gestiamo a mano per il routing host-based
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
