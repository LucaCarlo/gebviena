import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ComuneRaw {
  nome: string;
  codice: string;
  sigla: string;
  cap: string[];
}

/**
 * Importa i ~7.900 comuni italiani con i loro CAP dal dataset bundled
 * (data/comuni-italia.json). Idempotente: skipDuplicates=true non altera
 * i record già presenti. Per ri-importare dopo aggiornamento dataset, vuotare
 * prima la tabella City.
 */
export async function POST() {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const filePath = path.join(process.cwd(), "data", "comuni-italia.json");
    const raw = await fs.readFile(filePath, "utf8");
    const comuni = JSON.parse(raw) as ComuneRaw[];

    const provinces = await prisma.province.findMany({ select: { code: true } });
    const provinceSet = new Set(provinces.map((p) => p.code.toUpperCase()));

    let skipped = 0;
    const rows: { code: string; name: string; provinceCode: string; caps: string }[] = [];
    for (const c of comuni) {
      const sigla = (c.sigla || "").toUpperCase();
      if (!sigla || !provinceSet.has(sigla)) { skipped++; continue; }
      rows.push({
        code: c.codice,
        name: c.nome,
        provinceCode: sigla,
        caps: JSON.stringify(c.cap || []),
      });
    }

    // createMany è atomico per batch: insertN molto più veloce di N upsert.
    // skipDuplicates=true evita errori se la riga col PK esiste già (re-run).
    let createdEstimate = 0;
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const res = await prisma.city.createMany({ data: slice, skipDuplicates: true });
      createdEstimate += res.count;
    }

    const totalNow = await prisma.city.count();

    return NextResponse.json({
      success: true,
      datasetSize: comuni.length,
      skippedNoProvince: skipped,
      inserted: createdEstimate,
      totalInDb: totalNow,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
