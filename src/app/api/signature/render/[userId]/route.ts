import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public endpoint: serves the rendered HTML signature for a user.
 * URL: /api/signature/render/{userId}
 * This URL can be used in Outlook to load the signature remotely.
 * When the signature is updated, Outlook will pick up the changes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      signatureHtml: true,
    },
  });

  if (!user?.signatureHtml) {
    return new NextResponse("<html><body><p>Firma non configurata</p></body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(user.signatureHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
