import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

// GET — dati del professionista loggato (usato dal client / area pro).
export async function GET() {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, professional: null });
  return NextResponse.json({ success: true, professional: pro });
}

// PUT — aggiorna i dati personali del professionista loggato.
// L'email e il ruolo NON sono modificabili (richiedono intervento admin).
export async function PUT(req: NextRequest) {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const language = typeof body.language === "string" ? body.language.trim() : pro.language;

  if (!firstName || !lastName || !company) {
    return NextResponse.json({ success: false, error: "Nome, cognome e azienda sono obbligatori" }, { status: 400 });
  }
  if (firstName.length > 128 || lastName.length > 128 || company.length > 255) {
    return NextResponse.json({ success: false, error: "Uno dei campi supera la lunghezza massima" }, { status: 400 });
  }
  if (phone && phone.length > 32) {
    return NextResponse.json({ success: false, error: "Telefono troppo lungo" }, { status: 400 });
  }
  const validLangs = ["it", "fr", "en", "de", "es"];
  const lang = validLangs.includes(language) ? language : "it";

  const updated = await prisma.professional.update({
    where: { id: pro.id },
    data: { firstName, lastName, company, phone: phone || null, language: lang },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, company: true, role: true, language: true,
    },
  });

  return NextResponse.json({ success: true, professional: updated });
}
