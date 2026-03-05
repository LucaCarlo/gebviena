/**
 * Sync all users: link each user to the correct Role record
 * based on their `role` string field.
 *
 * - If a user already has a roleId, skip them
 * - If a user's role string matches a Role.name, link them
 * - If no match, default to "editor" role
 *
 * Run with: npx tsx scripts/sync-user-roles.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Get all roles
  const roles = await prisma.role.findMany();
  console.log(`Found ${roles.length} role(s) in DB:`);
  for (const r of roles) {
    console.log(`  - ${r.name} (${r.label}) → ${r.id}`);
  }

  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  // 2. Get all users
  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, role: true, roleId: true },
  });

  console.log(`\nFound ${users.length} user(s):\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.roleId) {
      console.log(`  ✓ ${user.email} (${user.role}) — already linked to roleId ${user.roleId}`);
      skipped++;
      continue;
    }

    // Find matching role
    let targetRoleId = roleMap.get(user.role);

    if (!targetRoleId) {
      // No exact match — default to "editor"
      targetRoleId = roleMap.get("editor");
      console.log(`  ⚠ ${user.email} — role "${user.role}" not found, defaulting to "editor"`);
    }

    if (!targetRoleId) {
      console.log(`  ✗ ${user.email} — no matching role and no "editor" fallback! Skipping.`);
      continue;
    }

    // Also update the role string to match the Role.name
    const roleName = roles.find((r) => r.id === targetRoleId)!.name;

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { roleId: targetRoleId, role: roleName },
    });

    console.log(`  ✓ ${user.email} — linked to role "${roleName}" (${targetRoleId})`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Already OK: ${skipped}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
