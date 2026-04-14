import { NextResponse, type NextRequest } from "next/server";
import { translateSegmentsBackward } from "@/lib/path-segments";

const KNOWN_PREFIXES = ["en", "de", "fr"];
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

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Apply admin-defined redirects first (matched against canonical path)
  const origin = req.nextUrl.origin;
  const redirects = await getRedirects(origin);
  if (redirects.length > 0) {
    // Match against pathname (with and without trailing slash)
    const candidates = [pathname, pathname.replace(/\/$/, ""), pathname + "/"];
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

  let lang = DEFAULT_LANG;
  let rest = segments;

  if (first && KNOWN_PREFIXES.includes(first)) {
    lang = first;
    rest = segments.slice(1);
    rest = translateSegmentsBackward(rest, lang);
  }

  const strippedPath = rest.length ? "/" + rest.join("/") : "/";

  const url = req.nextUrl.clone();
  url.pathname = strippedPath;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-gtv-lang", lang);
  requestHeaders.set("x-gtv-canonical-path", strippedPath);
  const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  res.headers.set("x-gtv-lang", lang);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|admin|static|favicon.ico).*)"],
};
