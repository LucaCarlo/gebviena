import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Cancellazione "totale" di uno o più contatti dalla vista unificata Utenti.
 * Rimuove per ciascuna email:
 *  - NewsletterSubscriber
 *  - EventRegistration
 *  - ContactTag (tutti i tag associati)
 *
 * Senza questo, "Elimina" dal pannello cancellava solo NewsletterSubscriber e
 * lasciava in piedi i tag e le registrazioni evento → l'utente riappariva
 * nell'elenco come record "tag-only" senza nome (es. i record spam).
 *
 * Body: { emails: string[] }  (case-insensitive, normalizzati a lowercase)
 */
export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const raw = Array.isArray(body.emails) ? body.emails : [];
    const emails = raw
      .filter((x: unknown): x is string => typeof x === "string")
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 0);

    if (emails.length === 0) {
      return NextResponse.json({ success: false, error: "Nessuna email fornita" }, { status: 400 });
    }
    if (emails.length > 5000) {
      return NextResponse.json({ success: false, error: "Troppe email in una sola richiesta" }, { status: 400 });
    }

    // Transazione: o cancelliamo tutto o niente. deleteMany usa where: in
    // quindi cancella anche le rows con email maiuscola (case-sensitive MySQL
    // dipende dalla collation: utf8mb4_unicode_ci è case-insensitive di default).
    const [subscribers, events, tags] = await prisma.$transaction([
      prisma.newsletterSubscriber.deleteMany({ where: { email: { in: emails } } }),
      prisma.eventRegistration.deleteMany({ where: { email: { in: emails } } }),
      prisma.contactTag.deleteMany({ where: { email: { in: emails } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        emails: emails.length,
        deletedSubscribers: subscribers.count,
        deletedEventRegistrations: events.count,
        deletedTags: tags.count,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[contacts/unified/delete] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
