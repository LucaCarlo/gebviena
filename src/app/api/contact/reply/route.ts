import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, error: "Destinatario, oggetto e corpo richiesti" }, { status: 400 });
    }

    const sent = await sendMail(to, subject, html);

    if (sent) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Invio fallito. Verifica le impostazioni SMTP." }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
