import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withSignature = searchParams.get("withSignature") === "true";

  const where = withSignature
    ? { isActive: true, signatureHtml: { not: null } }
    : { isActive: true };

  const users = await prisma.adminUser.findMany({
    where: where as Record<string, unknown>,
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Filter out users with empty signatures if withSignature
  const data = withSignature
    ? users.filter((u) => u.name) // all fetched have signatureHtml != null
    : users;

  return NextResponse.json({ success: true, data });
}
