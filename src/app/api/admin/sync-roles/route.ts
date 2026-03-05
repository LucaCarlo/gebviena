import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/sync-roles?key=gtv-sync-2024
 *
 * Links all users without a roleId to the correct Role record,
 * matching by the user's `role` string field.
 * Falls back to "editor" if no match found.
 *
 * Protected by a simple secret key in the query string.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== "gtv-sync-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, role: true, roleId: true },
  });

  const results: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.roleId) {
      results.push(`OK: ${user.email} (${user.role}) — already linked`);
      skipped++;
      continue;
    }

    let targetRoleId = roleMap.get(user.role);
    let targetRoleName = user.role;

    if (!targetRoleId) {
      targetRoleId = roleMap.get("editor");
      targetRoleName = "editor";
      results.push(`WARN: ${user.email} — role "${user.role}" not found, using "editor"`);
    }

    if (!targetRoleId) {
      results.push(`FAIL: ${user.email} — no matching role and no editor fallback`);
      continue;
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { roleId: targetRoleId, role: targetRoleName },
    });

    results.push(`UPDATED: ${user.email} → role "${targetRoleName}"`);
    updated++;
  }

  return NextResponse.json({
    success: true,
    summary: { total: users.length, updated, skipped },
    details: results,
  });
}
