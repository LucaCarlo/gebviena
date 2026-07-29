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

// Mappa mime -> estensione file, per garantire che il download abbia sempre
// l'estensione corretta (Windows/macOS altrimenti mostrano "FILE" senza icona).
function mimeToExt(ct: string): string {
  const t = ct.toLowerCase();
  if (t.includes("application/pdf")) return "pdf";
  if (t.includes("image/jpeg")) return "jpg";
  if (t.includes("image/png")) return "png";
  if (t.includes("image/webp")) return "webp";
  if (t.includes("image/gif")) return "gif";
  if (t.includes("image/svg")) return "svg";
  if (t.includes("video/mp4")) return "mp4";
  if (t.includes("video/webm")) return "webm";
  if (t.includes("video/quicktime")) return "mov";
  if (t.includes("application/zip")) return "zip";
  if (t.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) return "docx";
  if (t.includes("application/msword")) return "doc";
  if (t.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) return "xlsx";
  if (t.includes("application/vnd.ms-excel")) return "xls";
  if (t.includes("application/vnd.openxmlformats-officedocument.presentationml.presentation")) return "pptx";
  return "";
}

// Aggiunge/normalizza l'estensione: se il nome non termina gia' con quella dedotta
// dal content-type, la aggiunge. Serve perche' la UI a volte passa una "label"
// (es. "Scheda tecnica") senza estensione, e senza estensione l'OS mostra "FILE".
function ensureExtension(name: string, contentType: string): string {
  const ext = mimeToExt(contentType);
  if (!ext) return name;
  const current = (name.match(/\.([a-z0-9]{1,10})$/i)?.[1] || "").toLowerCase();
  if (current === ext) return name;
  const known = ["pdf","jpg","jpeg","png","webp","gif","svg","mp4","webm","mov","zip","doc","docx","xls","xlsx","pptx"];
  if (known.includes(current)) return name; // ha gia' un'estensione riconosciuta diversa: rispettala
  return `${name}.${ext}`;
}

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
        "Content-Disposition": `attachment; filename="${ensureExtension(safeName, contentType)}"`,
        "Content-Length": upstream.headers.get("content-length") || "",
        "Cache-Control": "private, no-store, must-revalidate",
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
        "Cache-Control": "private, no-store, must-revalidate",
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
      "Cache-Control": "private, no-store, must-revalidate",
    },
  });
}
