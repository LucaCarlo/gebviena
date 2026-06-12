import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/professional-notifications
 *   Lista TUTTE le notifiche (admin). Senza filtri di audience.
 *
 * POST /api/admin/professional-notifications
 *   Body: { type, title, body?, link?, audiences: string[] | null }
 *     - audiences=null  → 1 record con audience=NULL (visibile a tutti)
 *     - audiences=["RESELLER","AGENT"] → N record, uno per ruolo
 *   Le copie multi-ruolo condividono createdAt (timestamp identico al ms).
 */
export async function GET() {
  const auth = await requirePermission("newsletter", "view");
  if (isErrorResponse(auth)) return auth;

  const data = await prisma.professionalNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("newsletter", "create");
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const type = String(body?.type || "info").slice(0, 32);
  const title = String(body?.title || "").trim().slice(0, 255);
  const description = body?.body ? String(body.body).slice(0, 5000) : null;
  const link = body?.link ? String(body.link).slice(0, 500) : null;
  const audiences: string[] | null = Array.isArray(body?.audiences) ? body.audiences : null;

  if (!title) return NextResponse.json({ success: false, error: "Il titolo è obbligatorio" }, { status: 400 });

  const ALLOWED_ROLES = ["RESELLER", "AGENT", "ARCHITECT_DESIGNER", "PRESS"];
  const targets: (string | null)[] = audiences === null
    ? [null]
    : audiences.filter((r) => ALLOWED_ROLES.includes(r));
  if (targets.length === 0) {
    return NextResponse.json({ success: false, error: "Devi selezionare almeno un destinatario o scegliere 'Tutti'." }, { status: 400 });
  }

  // Stesso createdAt per le copie multi-ruolo (così l'admin UI le aggrega).
  const createdAt = new Date();
  const created = await prisma.$transaction(
    targets.map((audience) =>
      prisma.professionalNotification.create({
        data: { type, title, body: description, link, audience, createdAt },
      }),
    ),
  );

  return NextResponse.json({ success: true, data: created, count: created.length });
}
