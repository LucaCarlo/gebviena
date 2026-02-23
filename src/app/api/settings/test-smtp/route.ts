import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    // Get the admin email from settings or from the authenticated user
    const smtpSettings = await prisma.setting.findMany({ where: { group: "smtp" } });
    const config: Record<string, string> = {};
    for (const s of smtpSettings) config[s.key] = s.value;

    const adminEmail = config.smtp_from_email || auth.email;
    if (!adminEmail) {
      return NextResponse.json({ success: false, error: "Nessun indirizzo email configurato" }, { status: 400 });
    }

    if (!config.smtp_host || !config.smtp_user) {
      return NextResponse.json({ success: false, error: "SMTP non configurato. Compila prima le impostazioni SMTP." }, { status: 400 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #333;">Email di test - GTV Admin</h2>
        <p>Questa e' un'email di test inviata dal pannello di amministrazione GTV.</p>
        <p>Se ricevi questa email, la configurazione SMTP funziona correttamente.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Inviata il ${new Date().toLocaleString("it-IT")}</p>
      </div>
    `;

    const sent = await sendMail(adminEmail, "[GTV] Email di test SMTP", html);

    if (sent) {
      return NextResponse.json({ success: true, data: { message: `Email di test inviata con successo a ${adminEmail}` } });
    } else {
      return NextResponse.json({ success: false, error: "Invio email fallito. Verifica le impostazioni SMTP." }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: `Errore: ${String(e)}` }, { status: 500 });
  }
}
