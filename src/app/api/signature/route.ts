import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse, hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const result = await requirePermission("firma", "view");
  if (isErrorResponse(result)) return result;

  // User with "users.edit" permission can load any user's signature via ?userId=xxx
  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId");
  const canEditOthers = hasPermission(result.permissions, result.roleName, "users", "edit");
  const targetUserId =
    canEditOthers && requestedUserId
      ? requestedUserId
      : result.id;

  const user = await prisma.adminUser.findUnique({
    where: { id: targetUserId },
    select: {
      emailSignature: true,
      signatureHtml: true,
      signatureTemplate: true,
    },
  });

  // Parse user data
  let userData = null;
  if (user?.emailSignature) {
    try {
      const parsed = JSON.parse(user.emailSignature);
      if (parsed.version === 3) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { version, instagramUrl, facebookUrl, webLinkUrl, website, websiteUrl, ...rest } = parsed;
        userData = rest;
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      userData,
      template: user?.signatureTemplate || null,
      htmlOutput: user?.signatureHtml || null,
    },
  });
}

export async function PUT(req: Request) {
  const result = await requirePermission("firma", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { userData, htmlOutput, targetUserId } = await req.json();

    const canEditOthers = hasPermission(result.permissions, result.roleName, "users", "edit");
    const saveToUserId =
      canEditOthers && targetUserId
        ? targetUserId
        : result.id;

    if (userData) {
      // Strip legacy social fields — these are now template-level
      delete userData.instagramUrl;
      delete userData.facebookUrl;
      delete userData.webLinkUrl;
      delete userData.website;
      delete userData.websiteUrl;

      await prisma.adminUser.update({
        where: { id: saveToUserId },
        data: {
          emailSignature: JSON.stringify({ version: 3, ...userData }),
          signatureHtml: htmlOutput || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
