// URL SWAP generico: per ogni MediaFile sincronizzato, sostituisce /uploads/xxx
// con l'URL CDN in TUTTE le tabelle che potrebbero referenziarla.
// Args: --folder=X  oppure  --all
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const folderArg = args.find(a => a.startsWith("--folder="))?.slice(9);
const doAll = args.includes("--all");

if (!folderArg && !doAll) {
  console.error("Usage: node swap-urls.mjs --folder=X  |  --all");
  process.exit(1);
}

const where = { isSynced: true, wasabiUrl: { not: null } };
if (folderArg) where.folder = folderArg;

const files = await prisma.mediaFile.findMany({ where });
console.log(`File da fare swap: ${files.length}\n`);
if (files.length === 0) { await prisma.$disconnect(); process.exit(0); }

// Tabelle e colonne con URL
const TARGETS = [
  { table: "MediaFile", cols: ["url"] },
  { table: "HeroSlide", cols: ["imageUrl", "mobileImageUrl", "coverImage", "videoUrl"] },
  { table: "Product", cols: ["imageUrl", "coverImage", "techSheetUrl", "model2dUrl", "model3dUrl", "instructionsUrl", "careUrl"] },
  { table: "Designer", cols: ["imageUrl"] },
  { table: "Project", cols: ["imageUrl", "coverImage"] },
  { table: "Campaign", cols: ["imageUrl"] },
  { table: "Catalog", cols: ["fileUrl", "imageUrl", "previewImageUrl"] },
  { table: "CatalogCategory", cols: ["imageUrl"] },
  { table: "FabricFinishFile", cols: ["fileUrl"] },
  { table: "PageImage", cols: ["imageUrl"] },
  { table: "NewsArticle", cols: ["coverImage", "imageUrl", "content"] },
  { table: "NewsBlock", cols: ["content", "imageUrl"] },
  { table: "Setting", cols: ["value"] },
  { table: "LandingPageConfig", cols: ["heroImageUrl", "content"] },
  { table: "CompanyAsset", cols: ["fileUrl"] },
  { table: "Award", cols: ["imageUrl"] },
  { table: "ProfessionalImage", cols: ["fileUrl", "imageUrl"] },
  { table: "EmailTemplate", cols: ["content"] },
  { table: "DimensionBlock", cols: ["imageUrl"] },
];

let totalChanges = 0;
const tableStats = {};

for (const f of files) {
  const oldUrl = f.url;
  const newUrl = f.wasabiUrl;
  if (!oldUrl.startsWith("/uploads/") && !oldUrl.startsWith("https://gebruederthonetvienna-com.b-cdn.net/")) continue;
  if (!newUrl.startsWith("http")) continue;
  // Se url è già CDN (già swappata), skip
  if (oldUrl === newUrl) continue;

  for (const { table, cols } of TARGETS) {
    for (const col of cols) {
      try {
        const result = await prisma.$executeRawUnsafe(
          `UPDATE \`${table}\` SET \`${col}\` = REPLACE(\`${col}\`, ?, ?) WHERE \`${col}\` LIKE ?`,
          oldUrl, newUrl, `%${oldUrl}%`
        );
        if (result > 0) {
          tableStats[`${table}.${col}`] = (tableStats[`${table}.${col}`] || 0) + result;
          totalChanges += result;
        }
      } catch (e) {
        if (!String(e.message).includes("Unknown column") && !String(e.message).includes("doesn't exist")) {
          console.error(`ERR ${table}.${col}: ${e.message}`);
        }
      }
    }
  }
}

console.log("=== CAMBI PER TABELLA/COLONNA ===");
for (const [key, n] of Object.entries(tableStats).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${key.padEnd(35)} → ${n} righe`);
}
console.log(`\nTotal changes: ${totalChanges}`);
await prisma.$disconnect();
