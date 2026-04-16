import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function PUT(req: Request) {
  const result = await requirePermission("page_images", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { images } = await req.json() as {
      images: { page: string; section: string; label: string; imageUrl: string; altText?: string; linkUrl?: string; sortOrder?: number }[];
    };

    const results = await Promise.all(
      images.map((img) =>
        prisma.pageImage.upsert({
          where: { page_section: { page: img.page, section: img.section } },
          create: {
            page: img.page,
            section: img.section,
            label: img.label,
            imageUrl: img.imageUrl,
            altText: img.altText || null,
            linkUrl: img.linkUrl || null,
            sortOrder: img.sortOrder ?? 0,
          },
          update: {
            imageUrl: img.imageUrl,
            altText: img.altText || null,
            linkUrl: img.linkUrl ?? null,
            label: img.label,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
