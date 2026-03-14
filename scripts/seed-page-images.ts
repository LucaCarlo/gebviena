import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAGE_IMAGES = [
  // Mondo GTV
  { page: "mondo-gtv", section: "hero", label: "Hero", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=800&fit=crop", sortOrder: 0 },
  { page: "mondo-gtv", section: "heritage-section", label: "Sezione Heritage", imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&h=1080&fit=crop", sortOrder: 1 },
  { page: "mondo-gtv", section: "wood-craftsmanship", label: "L'arte del legno curvato", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=1000&fit=crop", sortOrder: 2 },

  // Professionisti
  { page: "professionisti", section: "hero", label: "Hero", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop", sortOrder: 0 },

  // Contatti
  { page: "contatti", section: "hero", label: "Hero", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop", sortOrder: 0 },

  // Heritage
  { page: "heritage", section: "thonet-family", label: "Michael Thonet e figli", imageUrl: "/images/Michael-Thonet-centre-with-his-five-sons.jpg", sortOrder: 0 },
  { page: "heritage", section: "sedia-n1", label: "Sedia N.1", imageUrl: "/images/heritage-sedia-n1.webp", sortOrder: 1 },
  { page: "heritage", section: "sedia-n4", label: "Sedia N.4", imageUrl: "/images/heritage-sedia-n4.webp", sortOrder: 2 },
  { page: "heritage", section: "hayworth-kelly", label: "Rita Hayworth e Gene Kelly", imageUrl: "/images/hayworth-kelly.webp", sortOrder: 3 },
  { page: "heritage", section: "le-corbusier", label: "Le Corbusier", imageUrl: "/images/le-corbusier.webp", sortOrder: 4 },
  { page: "heritage", section: "winston-churchill", label: "Winston Churchill", imageUrl: "/images/winston-churchill.webp", sortOrder: 5 },
  { page: "heritage", section: "heritage-journal", label: "Heritage Journal", imageUrl: "/images/heritage-journal.webp", sortOrder: 6 },
  { page: "heritage", section: "coin-authenticity", label: "La Moneta GTV", imageUrl: "/images/GTV-coin-authenticity.jpg", sortOrder: 7 },

  // Brand Manifesto
  { page: "brand-manifesto", section: "born-in-vienna", label: "Born in Vienna — Michael Thonet 1853", imageUrl: "/images/michael-thonet-1853.jpg", sortOrder: 0 },

  // Curvatura del Legno
  { page: "curvatura-legno", section: "tecnica-legname", label: "La Tecnica", imageUrl: "/images/tecnica-legname.webp", sortOrder: 0 },
  { page: "curvatura-legno", section: "curvatura-detail", label: "Curvatura — dettaglio", imageUrl: "/images/curvatura-img-1536x865.webp", sortOrder: 1 },
  { page: "curvatura-legno", section: "brevetto", label: "Il Brevetto", imageUrl: "/images/curvatura-brevetto.webp", sortOrder: 2 },

  // Sostenibilità
  { page: "sostenibilita", section: "legno-fsc", label: "Legno Certificato FSC", imageUrl: "/images/sostenibilita-legno.jpg", sortOrder: 0 },

  // GTV Experience
  { page: "gtv-experience", section: "stories", label: "Storie, visioni, ispirazioni", imageUrl: "/images/experience-stories.webp", sortOrder: 0 },
  { page: "gtv-experience", section: "lobby", label: "Lobby", imageUrl: "/images/experience-lobby.webp", sortOrder: 1 },
  { page: "gtv-experience", section: "landscape-1", label: "Veduta 1", imageUrl: "/images/foto-landscape-double-1.webp", sortOrder: 2 },
  { page: "gtv-experience", section: "landscape-2", label: "Veduta 2", imageUrl: "/images/foto-landscape-double-2.webp", sortOrder: 3 },
  { page: "gtv-experience", section: "corridors", label: "I Corridoi", imageUrl: "/images/experience-corridors.webp", sortOrder: 4 },
  { page: "gtv-experience", section: "camera-1", label: "Camera 1", imageUrl: "/images/INTERNO_MARCHE_023_17-683x1024.jpg", sortOrder: 5 },
  { page: "gtv-experience", section: "camera-2", label: "Camera 2", imageUrl: "/images/InternoMarche-34-751x1024.jpg", sortOrder: 6 },
  { page: "gtv-experience", section: "camera-3", label: "Camera 3", imageUrl: "/images/INTERNO_MARCHE_023_16-742x1024.jpg", sortOrder: 7 },
  { page: "gtv-experience", section: "carousel-1", label: "Slideshow — Magistretti", imageUrl: "/images/Magistretti-G03_1-2048x1365.jpg", sortOrder: 8 },
  { page: "gtv-experience", section: "carousel-2", label: "Slideshow — Secessione Viennese", imageUrl: "/images/Secessione-Viennese-G07_1-2048x1861.jpg", sortOrder: 9 },
  { page: "gtv-experience", section: "carousel-3", label: "Slideshow — Arts & Crafts", imageUrl: "/images/ArtsCrafts-G05_3-2048x1666.jpg", sortOrder: 10 },
  { page: "gtv-experience", section: "carousel-4", label: "Slideshow — Thonet 303 (1)", imageUrl: "/images/Thonet-303_1-2048x1365.jpg", sortOrder: 11 },
  { page: "gtv-experience", section: "carousel-5", label: "Slideshow — Thonet 303 (2)", imageUrl: "/images/Thonet-303_6-2048x1486.jpg", sortOrder: 12 },
  { page: "gtv-experience", section: "gamfratesi", label: "Vivi la GTV Experience", imageUrl: "/images/GamFratesi.jpg", sortOrder: 13 },

  // Realizzazioni Custom
  { page: "realizzazioni-custom", section: "main", label: "Immagine principale", imageUrl: "/images/professionisti-realizzazioni.webp", sortOrder: 0 },

  // Ufficio Stampa
  { page: "ufficio-stampa", section: "main", label: "Immagine principale", imageUrl: "/images/PEERS-design-by-Front-for-GTV-2-1024x768.jpg", sortOrder: 0 },

  // Richiesta Informazioni
  { page: "richiesta-info", section: "hero", label: "Hero", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop", sortOrder: 0 },

  // Rete Vendita
  { page: "rete-vendita", section: "hero-bg", label: "Sfondo Hero", imageUrl: "/foto-gebvienna/rete-di-vendita.png", sortOrder: 0 },
];

async function main() {
  console.log("Seeding page images...");

  for (const img of PAGE_IMAGES) {
    await prisma.pageImage.upsert({
      where: { page_section: { page: img.page, section: img.section } },
      create: img,
      update: { imageUrl: img.imageUrl, label: img.label, sortOrder: img.sortOrder },
    });
  }

  console.log(`Done! ${PAGE_IMAGES.length} page images seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
