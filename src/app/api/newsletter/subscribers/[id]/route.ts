import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  try {
    const data = await prisma.newsletterSubscriber.findUnique({ where: { id: params.id } });
    if (!data) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
    return NextResponse.json({ success: true, data });
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
