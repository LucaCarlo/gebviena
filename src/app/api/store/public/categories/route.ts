import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: tree of pubblished StoreCategory
export async function GET() {
  const cats = await prisma.storeCategory.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      parentId: true,
      slug: true,
      coverImage: true,
      sortOrder: true,
      translations: {
        select: { languageCode: true, name: true, slug: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: cats });
}
