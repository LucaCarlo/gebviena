const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.adminUser.findMany({ include: { roleRef: true } });
  console.log('=== Users ===');
  users.forEach(u => console.log(`${u.email} | role: ${u.role} | roleId: ${u.roleId} | roleRef:`, u.roleRef));

  const roles = await p.role.findMany();
  console.log('\n=== Roles ===');
  roles.forEach(r => console.log(`${r.name} (${r.label}) | permissions: ${r.permissions} | isSystem: ${r.isSystem}`));
}

main().catch(console.error).finally(() => p.$disconnect());
