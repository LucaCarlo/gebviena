import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const users = await p.adminUser.findMany({
    select: { email: true, role: true, name: true, isActive: true },
    orderBy: { role: "asc" },
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => p.$disconnect());
