import { NextRequest, NextResponse } from "next/server";
import { fetchFromS3, getActiveProvider } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth";
import { getAuthProfessional } from "@/lib/professional-auth";

/**
 * Proxy autenticato per i file su VAY Storage. Serve gli oggetti solo dopo
 * aver verificato che il richiedente sia un admin (adminUser) o un
 * professional loggato. Cosi i file possono restare NON PUBBLICI su Bunny
 * (pull zone spenta o token-protetta) e essere serviti solo agli utenti
 * autorizzati.
 *
 * Path: /api/vay/<folder>/<filename>  -> chiave storage: <folder>/<filename>
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Path mancante" }, { status: 400 });
  }

  // Sicurezza: rifiuto path traversal.
  if (path.some((p) => p.includes("..") || p.startsWith("/"))) {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  // Auth: admin OR professional. Serve almeno una delle due.
  const [admin, pro] = await Promise.all([getAuthUser(), getAuthProfessional()]);
  if (!admin && !pro) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const provider = await getActiveProvider();
  if (provider !== "vay") {
    return NextResponse.json({ error: "VAY CDN non attivo" }, { status: 404 });
  }

  const key = path.join("/");
  const obj = await fetchFromS3(key);
  if (!obj) {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(obj.body), {
    status: 200,
    headers: {
      "Content-Type": obj.contentType,
      // Cache privata: solo il browser dell'utente autenticato.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
