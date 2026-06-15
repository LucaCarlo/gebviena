import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET — list jobs (most recent first)
export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const jobs = await prisma.scheduledEmailJob.findMany({
    where,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      template: { select: { id: true, name: true, subject: true } },
      landingPage: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: jobs.map((j) => ({
      id: j.id,
      templateId: j.templateId,
      templateName: j.template?.name || null,
      landingPageId: j.landingPageId,
      landingPageName: j.landingPage?.name || null,
      totalCount: j.totalCount,
      scheduledAt: j.scheduledAt,
      status: j.status,
      sentCount: j.sentCount,
      failedCount: j.failedCount,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt,
    })),
  });
}

// POST — create a new scheduled job
export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const subscriberIds: string[] = body.subscriberIds || [];
    const templateId: string = body.templateId;
    const landingPageId: string | undefined = body.landingPageId || undefined;
    const scheduledAtRaw: string = body.scheduledAt; // ISO string

    if (!subscriberIds.length) {
      return NextResponse.json({ success: false, error: "Seleziona almeno un destinatario" }, { status: 400 });
    }
    if (!templateId) {
      return NextResponse.json({ success: false, error: "Seleziona un template" }, { status: 400 });
    }
    if (!scheduledAtRaw) {
      return NextResponse.json({ success: false, error: "Data/ora di invio richiesta" }, { status: 400 });
    }

    const scheduledAt = new Date(scheduledAtRaw);
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ success: false, error: "Data/ora non valida" }, { status: 400 });
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ success: false, error: "La data/ora deve essere nel futuro" }, { status: 400 });
    }

    const tpl = await prisma.emailTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
    if (!tpl) {
      return NextResponse.json({ success: false, error: "Template non trovato" }, { status: 404 });
    }

    const job = await prisma.scheduledEmailJob.create({
      data: {
        templateId,
        landingPageId: landingPageId || null,
        subscriberIds: JSON.stringify(subscriberIds),
        totalCount: subscriberIds.length,
        scheduledAt,
        status: "pending",
        createdById: auth.userId || null,
      },
    });

    return NextResponse.json({ success: true, data: { id: job.id, scheduledAt: job.scheduledAt } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
