import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getTagsForEmails } from "@/lib/tags";

export async function GET() {
  try {
    const data = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Batch-load tags for all subscribers
    const emails = data.map((d) => d.email);
    const tagsMap = await getTagsForEmails(emails);

    const enriched = data.map((d) => ({
      ...d,
      tags: tagsMap[d.email.toLowerCase().trim()] || [],
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: "IDs richiesti" }, { status: 400 });
    }

    await prisma.newsletterSubscriber.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
