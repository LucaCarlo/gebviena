import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthProfessional } from "@/lib/professional-auth";

/**
 * Endpoint proxy per FORZARE il download di file cross-origin (dal CDN Bunny)
 * e per convertire on-the-fly le immagini nel formato scelto dall'utente.
 *
 * Query:
 *   u       URL del file da scaricare (assoluta o /uploads/...)
 *   f       Nome file suggerito al browser
 *   format  Formato di conversione per immagini: jpg | png | webp | original
 *           - jpg  -> JPEG alta qualita (95, mozjpeg) — DEFAULT per giornalisti/social
 *           - png  -> PNG lossless
 *           - webp -> WebP q95
 *           - original -> nessuna conversione (serve il file cosi com'e')
 *           Se il file non e' un'immagine (PDF/video), format viene ignorato.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("u");
  const filename = req.nextUrl.searchParams.get("f") || "download";
  const format = (req.nextUrl.searchParams.get("format") || "").toLowerCase(); // jpg|png|webp|original|""

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const [admin, pro] = await Promise.all([getAuthUser(), getAuthProfessional()]);
  if (!admin && !pro) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const allowedPrefixes = [
    "https://cdn.gebruederthonetvienna.com/",
    "https://gebruederthonetvienna-com.b-cdn.net/",
    "https://vz-23199825-be8.b-cdn.net/",
    "/uploads/",
  ];
  if (!allowedPrefixes.some((p) => url.startsWith(p))) {
    return NextResponse.json({ error: "URL non consentito" }, { status: 400 });
  }

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

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const isImage = contentType.startsWith("image/");
  const wantsConversion = isImage && format && format !== "original";
  const safeName = filename.replace(/[\r\n"\\]/g, "_").slice(0, 200);

  // Se non serve conversione (non immagine, format assente, o "original"), stream diretto
  if (!wantsConversion) {
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": upstream.headers.get("content-length") || "",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Deduce estensione corrente dall'URL o dal content-type
  const lowerUrl = url.toLowerCase();
  const currentExt = lowerUrl.endsWith(".webp") || contentType === "image/webp" ? "webp"
    : lowerUrl.endsWith(".png") || contentType === "image/png" ? "png"
    : lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg") || contentType === "image/jpeg" ? "jpg"
    : "";

  // Se il file e' gia' nel formato richiesto, stream diretto (evita conversione superflua)
  if ((format === "jpg" && currentExt === "jpg") || (format === "png" && currentExt === "png") || (format === "webp" && currentExt === "webp")) {
    const nameBase = safeName.replace(/\.[^.]+$/, "");
    const finalName = `${nameBase}.${format}`;
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${finalName}"`,
        "Content-Length": upstream.headers.get("content-length") || "",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Conversione con sharp
  let converted: Buffer;
  let outMime: string;
  let outExt: string;
  try {
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const sharp = (await import("sharp")).default;
    if (format === "jpg") {
      // Alta qualita, mozjpeg per dimensione ottimale a parita' di qualita'
      // Flatten con sfondo bianco per PNG/WebP con trasparenza (evita "nero" indesiderato)
      converted = await sharp(buffer).flatten({ background: "#ffffff" }).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
      outMime = "image/jpeg";
      outExt = "jpg";
    } else if (format === "png") {
      converted = await sharp(buffer).png({ quality: 95 }).toBuffer();
      outMime = "image/png";
      outExt = "png";
    } else if (format === "webp") {
      converted = await sharp(buffer).webp({ quality: 95 }).toBuffer();
      outMime = "image/webp";
      outExt = "webp";
    } else {
      // Sconosciuto -> fallback originale
      converted = buffer;
      outMime = contentType;
      outExt = currentExt || "bin";
    }
  } catch (err) {
    console.error("[/api/download] sharp conversion failed:", err);
    return NextResponse.json({ error: "Errore conversione immagine" }, { status: 500 });
  }

  const nameBase = safeName.replace(/\.[^.]+$/, "");
  const finalName = `${nameBase}.${outExt}`;

  return new NextResponse(new Uint8Array(converted), {
    status: 200,
    headers: {
      "Content-Type": outMime,
      "Content-Disposition": `attachment; filename="${finalName}"`,
      "Content-Length": String(converted.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
