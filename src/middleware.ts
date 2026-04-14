import { NextResponse, type NextRequest } from "next/server";

// Static list mirrors active Language.urlPrefix values.
// Kept in sync at deploy time; admin-added prefixes need a server restart.
// (We can't query DB from middleware in Next.js edge runtime easily.)
const KNOWN_PREFIXES = ["en", "de", "fr"]; // IT is default (no prefix)
const DEFAULT_LANG = "it";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API, _next, static, admin
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  let lang = DEFAULT_LANG;
  let strippedPath = pathname;

  if (first && KNOWN_PREFIXES.includes(first)) {
    lang = first;
    strippedPath = "/" + segments.slice(1).join("/");
    if (strippedPath === "/") strippedPath = "/";
  }

  // Rewrite the URL to the un-prefixed path; pass lang via header
  const url = req.nextUrl.clone();
  url.pathname = strippedPath;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-gtv-lang", lang);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|admin|static|favicon.ico).*)"],
};
