import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const result = await requirePermission("contacts", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, error: "Destinatario, oggetto e corpo richiesti" }, { status: 400 });
    }

    // Fetch admin user for reply-from info and signature
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: result.id },
      select: { email: true, name: true, signatureHtml: true },
    });

    // Append signature if exists
    let finalHtml = html;
    if (adminUser?.signatureHtml) {
      finalHtml += `<br/><br/>${adminUser.signatureHtml}`;
    }

    const sent = await sendMail(to, subject, finalHtml, {
      fromName: adminUser?.name || undefined,
      fromEmail: adminUser?.email || undefined,
    });

    if (sent) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Invio fallito. Verifica le impostazioni SMTP." }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
