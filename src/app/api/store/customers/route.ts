import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_customers", "view");
  if (isErrorResponse(result)) return result;

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const hasOrders = sp.get("hasOrders");
  const format = (sp.get("format") || "").toLowerCase();
  const isCsv = format === "csv";
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "50", 10) || 50, 1), 200);
  const ALLOWED_SORT = new Set(["createdAt", "email", "firstName", "lastName", "phone"]);
  const sortByParam = sp.get("sortBy") || "createdAt";
  const sortBy = ALLOWED_SORT.has(sortByParam) ? sortByParam : "createdAt";
  const sortDir: "asc" | "desc" = sp.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  if (hasOrders === "true") where.orders = { some: {} };
  if (hasOrders === "false") where.orders = { none: {} };

  const totalCount = await prisma.customer.count({ where });

  const customers = await prisma.customer.findMany({
    where,
    include: {
      _count: { select: { orders: true, addresses: true } },
      orders: { select: { totalCents: true, currency: true, status: true } },
    },
    orderBy: { [sortBy]: sortDir } as Prisma.CustomerOrderByWithRelationInput,
    // CSV: ritorna tutto (cap di sicurezza 10k). UI: paginazione skip/take.
    skip: isCsv ? 0 : (page - 1) * pageSize,
    take: isCsv ? 10000 : pageSize,
  });

  const data = customers.map((c) => {
    const nonRefunded = c.orders.filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED");
    const lifetimeCents = nonRefunded.reduce((s, o) => s + o.totalCents, 0);
    return {
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      isGuest: !c.passwordHash,
      isActive: c.isActive,
      marketingOptIn: c.marketingOptIn,
      createdAt: c.createdAt,
      lastLoginAt: c.lastLoginAt,
      ordersCount: c._count.orders,
      addressesCount: c._count.addresses,
      lifetimeCents,
      currency: c.orders[0]?.currency || "EUR",
    };
  });

  if (isCsv) {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = ["Email", "Nome", "Cognome", "Telefono", "Tipo", "Ordini", "Speso (€)", "Marketing OptIn", "Registrato"].join(",");
    const lines = data.map((c) => [
      esc(c.email), esc(c.firstName), esc(c.lastName), esc(c.phone),
      esc(c.isGuest ? "guest" : "registrato"),
      esc(c.ordersCount), esc((c.lifetimeCents / 100).toFixed(2)),
      esc(c.marketingOptIn ? "si" : "no"),
      esc(new Date(c.createdAt).toISOString()),
    ].join(","));
    const csv = "﻿" + [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clienti-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ success: true, data, totalCount, page, pageSize });
}
