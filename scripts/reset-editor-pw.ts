import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("editor123", 12);
  await p.adminUser.update({
    where: { email: "editor@gebvienna.com" },
    data: { passwordHash: hash },
  });
  console.log("Editor password reset to editor123");
}

main().finally(() => p.$disconnect());
