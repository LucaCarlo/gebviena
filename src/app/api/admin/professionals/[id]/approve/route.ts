import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { generateRandomPassword, sendApprovalCredentials } from "@/lib/professional-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/professionals/:id/approve
 * Approva una richiesta di accesso pending: genera una password random forte,
 * la hasha, aggiorna il record (pendingApproval=false, isActive=true) e invia
 * la mail con le credenziali al richiedente. Idempotente: se già approvato,
 * ritorna conflict senza fare niente.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const pro = await prisma.professional.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
        pendingApproval: true,
        isActive: true,
      },
    });
    if (!pro) {
      return NextResponse.json({ success: false, error: "Richiesta non trovata" }, { status: 404 });
    }
    if (!pro.pendingApproval) {
      return NextResponse.json({ success: false, error: "Richiesta già approvata o non in attesa" }, { status: 409 });
    }

    const plaintextPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(plaintextPassword, 10);

    await prisma.professional.update({
      where: { id: pro.id },
      data: {
        passwordHash,
        pendingApproval: false,
        isActive: true,
        approvedAt: new Date(),
      },
    });

    // Invia la mail con le credenziali. Se l'invio fallisce loggiamo ma NON
    // rollback: l'admin può sempre cliccare "Invia di nuovo le credenziali"
    // in futuro o reset password. (Per ora segnaliamo l'errore via response.)
    let mailOk = true;
    let mailError: string | null = null;
    try {
      await sendApprovalCredentials(
        { firstName: pro.firstName, lastName: pro.lastName, email: pro.email, language: pro.language },
        plaintextPassword
      );
    } catch (e) {
      mailOk = false;
      mailError = e instanceof Error ? e.message : String(e);
      console.error("[admin/approve] sendApprovalCredentials failed:", mailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: pro.id,
        mailOk,
        mailError,
        // SOLO se la mail è fallita ritorniamo la password in chiaro,
        // così l'admin può comunicarla manualmente. Altrimenti omessa per sicurezza.
        ...(mailOk ? {} : { plaintextPassword }),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/professionals/:id/approve] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
