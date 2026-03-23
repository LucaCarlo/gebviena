const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.adminUser.findMany();
  console.log('=== Admin Users ===');
  console.log(JSON.stringify(users, null, 2));

  const products = await p.product.count();
  const designers = await p.designer.count();
  const projects = await p.project.count();
  const heroSlides = await p.heroSlide.count();
  console.log('\n=== Counts ===');
  console.log('Products:', products);
  console.log('Designers:', designers);
  console.log('Projects:', projects);
  console.log('HeroSlides:', heroSlides);
}

main().catch(console.error).finally(() => p.$disconnect());
