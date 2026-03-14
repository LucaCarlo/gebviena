import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const users = await p.adminUser.findMany({
    select: { id: true, email: true, role: true, roleId: true, isActive: true },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const roles = await p.role.findMany({
    select: { id: true, name: true, label: true, permissions: true },
  });
  console.log("ROLES:", JSON.stringify(roles, null, 2));
}

main().finally(() => p.$disconnect());
