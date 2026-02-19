import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const media = await prisma.mediaFile.findUnique({ where: { id: params.id } });
  if (!media) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }

  // Delete physical file from disk
  try {
    const filepath = path.join(process.cwd(), "public", media.url);
    await unlink(filepath);
  } catch {
    // File may already be deleted, continue with DB cleanup
  }

  await prisma.mediaFile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
