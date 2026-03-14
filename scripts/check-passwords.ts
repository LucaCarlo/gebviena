import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

async function main() {
  const users = await p.adminUser.findMany({
    select: { id: true, email: true, passwordHash: true },
  });

  for (const u of users) {
    const matchAdmin123 = await bcrypt.compare("admin123", u.passwordHash);
    const matchEditor123 = await bcrypt.compare("editor123", u.passwordHash);
    console.log(`${u.email}: admin123=${matchAdmin123}, editor123=${matchEditor123}, hash=${u.passwordHash.substring(0, 20)}...`);
  }
}

main().finally(() => p.$disconnect());
