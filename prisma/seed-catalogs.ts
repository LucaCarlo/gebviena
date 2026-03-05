import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const catalogs = [
    {
      name: "Catalogo 2025",
      slug: "catalogo-2025",
      section: "cataloghi",
      pretitle: "Catalogo",
      title: "Catalogo 2025",
      description: "Scopri l'intera collezione Gebrüder Thonet Vienna nell'ultimo catalogo disponibile. Qui troverai tutti i nostri pezzi iconici, storici e contemporanei che uniscono tradizione e innovazione, ideali per arredare con eleganza ogni tipo di spazio. Scarica il catalogo completo ed esplora i dettagli, i materiali e le finiture che definiscono l'essenza dei nostri arredi.",
      imageUrl: "/images/catalogo-2024-819x1024.webp",
      pdfUrl: "",
      linkText: "Scarica il catalogo 2025",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Poster 2024",
      slug: "poster-2024",
      section: "cataloghi",
      pretitle: "Poster",
      title: "Poster 2024",
      description: "Uno strumento pratico e iconico, da consultare e conservare. L'intera collezione a portata di mano accompagnata dai singoli dettagli tecnici.",
      imageUrl: "/images/Progetto-senza-titolo-724x1024.png",
      pdfUrl: "",
      linkText: "Scarica il poster",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Slow Living Magazine Issue 2",
      slug: "slow-living-issue-2",
      section: "slow-living",
      pretitle: "Slow Living Magazine | Issue N° 2",
      title: "Interno Marche",
      description: "Dentro le pagine, il racconto di Interno Marche: un luogo dove il design di GTV incontra la storia e la trasforma in esperienza. Un viaggio tra architettura, memoria e contemporaneità, da vivere lentamente.",
      imageUrl: "/images/Interno-Marche_Issue-02_pages-to-jpg-0001-1195x1536.jpg",
      pdfUrl: "",
      linkText: "Scarica il magazine",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Slow Living Magazine Issue 1",
      slug: "slow-living-issue-1",
      section: "slow-living",
      pretitle: "Slow Living Magazine | Issue N° 1",
      title: "La Saracena",
      description: "Nel silenzio raffinato della villa La Saracena, il tempo rallenta e lascia spazio alla contemplazione. Design, architettura e natura dialogano in armonia, rivelando un nuovo modo di abitare: più consapevole, più profondo.\n\nCon Slow Living Magazine, celebriamo la bellezza dei dettagli e l'arte del vivere lento.",
      imageUrl: "/images/Slow-Living-Magazine_La-Saracena_page-0001-1-1155x1536.jpg",
      pdfUrl: "",
      linkText: "Scarica il magazine",
      sortOrder: 2,
      isActive: true,
    },
  ];

  for (const catalog of catalogs) {
    await prisma.catalog.upsert({
      where: { slug: catalog.slug },
      update: catalog,
      create: catalog,
    });
    console.log(`✓ ${catalog.name}`);
  }
}

main()
  .then(() => { console.log("Done!"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
