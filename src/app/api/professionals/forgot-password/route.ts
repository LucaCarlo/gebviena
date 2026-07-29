import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { randomBytes } from "crypto";
import { headers } from "next/headers";

/**
 * POST /api/professionals/forgot-password
 * Body: { email }
 * Genera un token di reset, lo salva sul Professional, invia email con link
 * https://<sito>/area-professionisti/reimposta-password/<token>
 *
 * Per motivi di privacy, rispondiamo SEMPRE con success (non facciamo capire
 * se l'email esiste o meno).
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Email mancante" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const pro = await prisma.professional.findUnique({ where: { email: normalized } });

    if (pro && pro.isActive && !pro.pendingApproval) {
      const token = randomBytes(48).toString("hex"); // 96 char hex
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

      await prisma.professional.update({
        where: { id: pro.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expiresAt,
        },
      });

      // Costruisci URL prendendo l'host dalla richiesta (funziona in prod + dev)
      const h = await headers();
      const host = h.get("x-forwarded-host") || h.get("host") || "gebruederthonetvienna.com";
      const proto = h.get("x-forwarded-proto") || "https";
      const resetUrl = `${proto}://${host}/area-professionisti/reimposta-password/${token}`;

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="margin:0 0 16px;font-weight:400;letter-spacing:0.02em">Recupero password — Area Professionisti GTV</h2>
          <p>Ciao ${pro.firstName || ""},</p>
          <p>Hai richiesto di reimpostare la password del tuo account professionale su Gebrüder Thonet Vienna.</p>
          <p>Clicca il pulsante sotto per impostare una nuova password. Il link è valido per <strong>1 ora</strong>.</p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 24px;display:inline-block;letter-spacing:0.05em;text-transform:uppercase;font-size:13px">
              Reimposta password
            </a>
          </p>
          <p style="font-size:12px;color:#666">Se il pulsante non funziona, copia questo link nel browser:<br><code style="word-break:break-all">${resetUrl}</code></p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
          <p style="font-size:12px;color:#888">Se non hai richiesto tu il reset, ignora questa email — la tua password resta invariata.</p>
        </div>
      `;

      // Fire-and-forget: non attendiamo il risultato per non bloccare la risposta
      sendMail(normalized, "Recupero password Area Professionisti GTV", html).catch((err) =>
        console.error("[forgot-password] sendMail error:", err)
      );
    }

    // Risposta uniforme (non far capire se l'email esiste)
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
