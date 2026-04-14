import { NextResponse, type NextRequest } from "next/server";
import { translateSegmentsBackward } from "@/lib/path-segments";

const KNOWN_PREFIXES = ["en", "de", "fr"];
const DEFAULT_LANG = "it";

export function middleware(req: NextRequest) {
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

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  let lang = DEFAULT_LANG;
  let rest = segments;

  if (first && KNOWN_PREFIXES.includes(first)) {
    lang = first;
    rest = segments.slice(1);
    // Translate non-IT segments back to IT canonical so the page route resolves
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
