import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { readdir, stat } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execP = promisify(exec);

async function duSize(dir: string): Promise<number> {
  try {
    const { stdout } = await execP(`du -sb ${JSON.stringify(dir)}`, { maxBuffer: 2 * 1024 * 1024 });
    const n = parseInt(stdout.split("\t")[0], 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

interface TypeBucket {
  count: number;
  size: number;
}

const IMAGE_EXT = new Set([".webp", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".avif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv"]);
const PDF_EXT = new Set([".pdf"]);
const ARCHIVE_EXT = new Set([".zip", ".rar", ".7z", ".tar", ".gz"]);

async function walkUploads(dir: string) {
  const byType: Record<string, TypeBucket> = {
    images: { count: 0, size: 0 },
    videos: { count: 0, size: 0 },
    pdf: { count: 0, size: 0 },
    archives: { count: 0, size: 0 },
    other: { count: 0, size: 0 },
  };
  const largest: Array<{ name: string; size: number; path: string }> = [];
  let totalSize = 0;
  let totalCount = 0;

  async function walk(current: string, relativeRoot: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        let st;
        try {
          st = await stat(full);
        } catch {
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        let bucket: string;
        if (IMAGE_EXT.has(ext)) bucket = "images";
        else if (VIDEO_EXT.has(ext)) bucket = "videos";
        else if (PDF_EXT.has(ext)) bucket = "pdf";
        else if (ARCHIVE_EXT.has(ext)) bucket = "archives";
        else bucket = "other";
        byType[bucket].count++;
        byType[bucket].size += st.size;
        totalSize += st.size;
        totalCount++;

        largest.push({ name: entry.name, size: st.size, path: rel });
      }
    }
  }

  await walk(dir, "");

  largest.sort((a, b) => b.size - a.size);
  return {
    totalSize,
    totalCount,
    byType,
    largest: largest.slice(0, 10),
  };
}

async function getDbSize(): Promise<{ sizeBytes: number; tableCount: number }> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ size: bigint | number | null; count: bigint | number | null }>>(
      `SELECT COALESCE(SUM(data_length + index_length), 0) AS size, COUNT(*) AS count
       FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const r = rows[0];
    const sizeBytes = Number(r?.size ?? 0);
    const tableCount = Number(r?.count ?? 0);
    return { sizeBytes, tableCount };
  } catch {
    return { sizeBytes: 0, tableCount: 0 };
  }
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const cwd = process.cwd();
    const uploadsDir = path.join(cwd, "public", "uploads");
    const publicDir = path.join(cwd, "public");
    const nextDir = path.join(cwd, ".next");
    const nodeModulesDir = path.join(cwd, "node_modules");

    const [
      productsCount,
      designersCount,
      projectsCount,
      campaignsCount,
      awardsCount,
      heroSlidesCount,
      pageImagesCount,
      languagesCount,
      pointsOfSaleCount,
      newsletterSubscribersCount,
      contactSubmissionsCount,
      settingsCount,
      mediaFilesCount,
      adminUsersCount,
      mediaAggregations,
      imageCount,
      syncedCount,
      unsyncedCount,
      uploads,
      publicTotal,
      nextTotal,
      nodeModulesTotal,
      cwdTotal,
      db,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.designer.count(),
      prisma.project.count(),
      prisma.campaign.count(),
      prisma.award.count(),
      prisma.heroSlide.count(),
      prisma.pageImage.count(),
      prisma.language.count(),
      prisma.pointOfSale.count(),
      prisma.newsletterSubscriber.count(),
      prisma.contactSubmission.count(),
      prisma.setting.count(),
      prisma.mediaFile.count(),
      prisma.adminUser.count(),
      prisma.mediaFile.aggregate({
        _sum: { size: true, originalSize: true },
      }),
      prisma.mediaFile.count({ where: { mimeType: { startsWith: "image/" } } }),
      prisma.mediaFile.count({ where: { isSynced: true } }),
      prisma.mediaFile.count({ where: { isSynced: false } }),
      walkUploads(uploadsDir),
      duSize(publicDir),
      duSize(nextDir),
      duSize(nodeModulesDir),
      duSize(cwd),
      getDbSize(),
    ]);

    const sourceOther = Math.max(0, cwdTotal - publicTotal - nextTotal - nodeModulesTotal);
    const grandTotal = cwdTotal + db.sizeBytes;

    const totalSize = mediaAggregations._sum.size || 0;
    const totalOriginalSize = mediaAggregations._sum.originalSize || 0;
    const spaceSaved = totalOriginalSize - totalSize;
    const optimizationPercent = totalOriginalSize > 0
      ? Math.round((spaceSaved / totalOriginalSize) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        tables: {
          products: productsCount,
          designers: designersCount,
          projects: projectsCount,
          campaigns: campaignsCount,
          awards: awardsCount,
          heroSlides: heroSlidesCount,
          pageImages: pageImagesCount,
          languages: languagesCount,
          pointsOfSale: pointsOfSaleCount,
          newsletterSubscribers: newsletterSubscribersCount,
          contactSubmissions: contactSubmissionsCount,
          settings: settingsCount,
          mediaFiles: mediaFilesCount,
          adminUsers: adminUsersCount,
        },
        storage: {
          totalSize,
          totalOriginalSize,
          spaceSaved,
          optimizationPercent,
        },
        media: {
          images: imageCount,
          others: mediaFilesCount - imageCount,
          synced: syncedCount,
          unsynced: unsyncedCount,
        },
        disk: {
          grandTotal,
          cwdTotal,
          uploadsTotal: uploads.totalSize,
          uploadsCount: uploads.totalCount,
          uploadsByType: uploads.byType,
          largestFiles: uploads.largest,
          publicTotal,
          nextTotal,
          nodeModulesTotal,
          sourceOther,
          dbSize: db.sizeBytes,
          dbTables: db.tableCount,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
