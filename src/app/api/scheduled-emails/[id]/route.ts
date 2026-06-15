import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// DELETE — cancel a pending scheduled job
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.scheduledEmailJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ success: false, error: "Job non trovato" }, { status: 404 });
  }
  if (job.status !== "pending") {
    return NextResponse.json(
      { success: false, error: `Impossibile cancellare un job in stato '${job.status}'` },
      { status: 409 }
    );
  }

  await prisma.scheduledEmailJob.update({
    where: { id },
    data: { status: "cancelled", completedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
