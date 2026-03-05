import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }

  const data = await prisma.project.findUnique({
    where: { slug },
    include: {
      products: {
        include: {
          product: {
            include: { designer: true },
          },
        },
      },
    },
  });

  if (!data || !data.isActive) {
    return NextResponse.json({ success: false, error: "Progetto non trovato" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}
