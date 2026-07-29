import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthProfessional } from "@/lib/professional-auth";

/**
 * Endpoint proxy per FORZARE il download di file cross-origin (dal CDN Bunny).
 *
 * Il browser HTML `download` attribute NON funziona per URL cross-origin
 * senza header `Content-Disposition: attachment` dal server. Da quando le
 * immagini sono su cdn.gebruederthonetvienna.com (dominio diverso), gli
 * `<a download>` aprono la foto invece di scaricarla.
 *
 * Questo endpoint fetcha il file dal CDN e lo re-serve con il header giusto.
 *
 * GET /api/download?u=<encoded url>&f=<filename>
 *
 * Auth: admin O professional loggato.
 * Sicurezza: accetta solo URL che iniziano con https://cdn.gebruederthonetvienna.com/
 * (o con /uploads/... per file locali residui) per evitare open redirect.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("u");
  const filename = req.nextUrl.searchParams.get("f") || "download";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Auth check: admin OR professional
  const [admin, pro] = await Promise.all([getAuthUser(), getAuthProfessional()]);
  if (!admin && !pro) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Whitelist URL sources per sicurezza
  const allowedPrefixes = [
    "https://cdn.gebruederthonetvienna.com/",
    "https://gebruederthonetvienna-com.b-cdn.net/",
    "https://vz-23199825-be8.b-cdn.net/",
    "/uploads/",
  ];
  const isAllowed = allowedPrefixes.some((p) => url.startsWith(p));
  if (!isAllowed) {
    return NextResponse.json({ error: "URL non consentito" }, { status: 400 });
  }

  // Fetch il file
  const targetUrl = url.startsWith("/uploads/") ? `${req.nextUrl.origin}${url}` : url;
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Errore fetch file" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: "File non trovato" }, { status: upstream.status });
  }

  // Sanitize filename: rimuovi caratteri pericolosi per Content-Disposition
  const safeName = filename.replace(/[\r\n"\\]/g, "_").slice(0, 200);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": upstream.headers.get("content-length") || "",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
