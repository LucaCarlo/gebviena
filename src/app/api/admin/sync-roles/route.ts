import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// All permission keys (resource.action)
const RESOURCES = [
  "users","roles","products","designers","projects","campaigns","awards",
  "catalogs","news","stores","agents","newsletter","contacts","forms",
  "media","hero","settings","analytics","firma","import_export",
];
const ACTIONS = ["view","create","edit","delete"];

function allKeys() {
  const keys: string[] = [];
  for (const r of RESOURCES) for (const a of ACTIONS) keys.push(`${r}.${a}`);
  return keys;
}

function allTrue() {
  const p: Record<string,boolean> = {};
  for (const k of allKeys()) p[k] = true;
  return p;
}

function makePerms(allow: Record<string,boolean>) {
  const p: Record<string,boolean> = {};
  for (const k of allKeys()) p[k] = allow[k] ?? false;
  return p;
}

// Role definitions (same as seed-roles.ts)
const ROLE_DEFS = [
  { name: "superadmin", label: "Super Admin", sort: 0, perms: allTrue() },
  { name: "admin", label: "Amministratore", sort: 1, perms: allTrue() },
  { name: "editor", label: "Editor", sort: 2, perms: makePerms({
    "products.view":true,"products.create":true,"products.edit":true,
    "designers.view":true,"designers.create":true,"designers.edit":true,
    "projects.view":true,"projects.create":true,"projects.edit":true,
    "campaigns.view":true,"campaigns.create":true,"campaigns.edit":true,
    "awards.view":true,"awards.create":true,"awards.edit":true,
    "catalogs.view":true,"catalogs.create":true,"catalogs.edit":true,
    "news.view":true,"news.create":true,"news.edit":true,
    "newsletter.view":true,"contacts.view":true,
    "media.view":true,"media.create":true,"media.edit":true,
    "hero.view":true,"hero.create":true,"hero.edit":true,
    "firma.view":true,"firma.edit":true,
  })},
  { name: "agent", label: "Agente", sort: 3, perms: makePerms({
    "stores.view":true,"agents.view":true,"contacts.view":true,
    "firma.view":true,"firma.edit":true,
  })},
  { name: "client", label: "Cliente Finale", sort: 4, perms: makePerms({
    "firma.view":true,
  })},
  { name: "designer", label: "Designer", sort: 5, perms: makePerms({
    "products.view":true,"projects.view":true,"firma.view":true,
  })},
  { name: "architect", label: "Architetto", sort: 6, perms: makePerms({
    "products.view":true,"projects.view":true,"firma.view":true,
  })},
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== "gtv-sync-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // Step 1: Create roles if missing
  let rolesCreated = 0;
  for (const def of ROLE_DEFS) {
    const existing = await prisma.role.findUnique({ where: { name: def.name } });
    if (existing) {
      results.push(`ROLE OK: ${def.name} already exists`);
      continue;
    }
    await prisma.role.create({
      data: {
        name: def.name,
        label: def.label,
        permissions: JSON.stringify(def.perms),
        isSystem: true,
        sortOrder: def.sort,
      },
    });
    results.push(`ROLE CREATED: ${def.name} (${def.label})`);
    rolesCreated++;
  }

  // Step 2: Link users to roles
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, role: true, roleId: true },
  });

  let usersUpdated = 0;
  let usersSkipped = 0;

  for (const user of users) {
    if (user.roleId) {
      results.push(`USER OK: ${user.email} — already linked`);
      usersSkipped++;
      continue;
    }

    let targetRoleId = roleMap.get(user.role);
    let targetRoleName = user.role;

    if (!targetRoleId) {
      targetRoleId = roleMap.get("editor");
      targetRoleName = "editor";
    }

    if (!targetRoleId) {
      results.push(`USER FAIL: ${user.email} — no role found`);
      continue;
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { roleId: targetRoleId, role: targetRoleName },
    });

    results.push(`USER UPDATED: ${user.email} → "${targetRoleName}"`);
    usersUpdated++;
  }

  return NextResponse.json({
    success: true,
    summary: {
      rolesCreated,
      totalUsers: users.length,
      usersUpdated,
      usersSkipped,
    },
    details: results,
  });
}
