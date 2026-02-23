import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { subscriberIds, subject, html } = await req.json();

    if (!subject || !html) {
      return NextResponse.json({ success: false, error: "Oggetto e corpo email richiesti" }, { status: 400 });
    }

    if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return NextResponse.json({ success: false, error: "Seleziona almeno un destinatario" }, { status: 400 });
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { id: { in: subscriberIds } },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun destinatario trovato" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const ok = await sendMail(sub.email, subject, html);
      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, total: subscribers.length },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
