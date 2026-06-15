import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  try {
    const data = await prisma.newsletterSubscriber.findUnique({ where: { id: params.id } });
    if (!data) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

    // Arricchimento per la pagina dettaglio admin: tag + event registrations
    // associati a questa email. Optimistic, in caso di errore restituisce
    // comunque il subscriber base.
    const [tagsLink, eventRegs, contactSubs, professional] = await Promise.all([
      prisma.contactTag.findMany({
        where: { email: data.email },
        select: { createdAt: true, tag: { select: { id: true, name: true, slug: true, color: true } } },
      }).catch(() => [] as Array<{ createdAt: Date; tag: { id: string; name: string; slug: string; color: string } }>),
      prisma.eventRegistration.findMany({
        where: { email: data.email },
        select: {
          id: true, firstName: true, lastName: true, company: true, country: true, city: true,
          checkedIn: true, checkedInAt: true, languageCode: true, createdAt: true,
          landingPageId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch(() => [] as Array<{ id: string; firstName: string; lastName: string; company: string | null; country: string; city: string; checkedIn: boolean; checkedInAt: Date | null; languageCode: string | null; createdAt: Date; landingPageId: string | null }>),
      prisma.contactSubmission.findMany({
        where: { email: data.email },
        select: { id: true, type: true, subject: true, message: true, isRead: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }).catch(() => [] as Array<{ id: string; type: string; subject: string | null; message: string; isRead: boolean; createdAt: Date }>),
      prisma.professional.findUnique({
        where: { email: data.email },
        select: { id: true, role: true, isActive: true, pendingApproval: true, createdAt: true },
      }).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        tags: tagsLink.map((tl) => ({ ...tl.tag, addedAt: tl.createdAt })),
        eventRegistrations: eventRegs,
        contactSubmissions: contactSubs,
        professional, // null se l'utente non è anche un professional
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fields = ["firstName", "lastName", "company", "phone", "profile", "address", "city", "zip", "province", "country", "website", "notes"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f] || null;
    }
    if (body.acceptsPrivacy !== undefined) updateData.acceptsPrivacy = body.acceptsPrivacy;
    if (body.acceptsUpdates !== undefined) updateData.acceptsUpdates = body.acceptsUpdates;
    if (body.email !== undefined) updateData.email = body.email;

    const data = await prisma.newsletterSubscriber.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    await prisma.newsletterSubscriber.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
