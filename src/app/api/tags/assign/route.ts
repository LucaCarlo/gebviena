import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// POST - assign tag(s) to email(s)
export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  const { emails, tagIds } = await req.json();
  if (!emails?.length || !tagIds?.length) {
    return NextResponse.json({ success: false, error: "emails e tagIds obbligatori" }, { status: 400 });
  }

  const data: { email: string; tagId: string }[] = [];
  for (const email of emails) {
    for (const tagId of tagIds) {
      data.push({ email: email.toLowerCase().trim(), tagId });
    }
  }

  // skipDuplicates avoids errors if already assigned
  const created = await prisma.contactTag.createMany({ data, skipDuplicates: true });

  return NextResponse.json({ success: true, assigned: created.count });
}

// DELETE - remove tag(s) from email(s)
export async function DELETE(req: Request) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  const { emails, tagIds } = await req.json();
  if (!emails?.length || !tagIds?.length) {
    return NextResponse.json({ success: false, error: "emails e tagIds obbligatori" }, { status: 400 });
  }

  await prisma.contactTag.deleteMany({
    where: {
      email: { in: emails.map((e: string) => e.toLowerCase().trim()) },
      tagId: { in: tagIds },
    },
  });

  return NextResponse.json({ success: true });
}
