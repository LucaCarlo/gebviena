import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin users
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@gebvienna.com" },
    update: {},
    create: { email: "admin@gebvienna.com", passwordHash, name: "Admin", role: "admin" },
  });
  await prisma.adminUser.upsert({
    where: { email: "editor@gebvienna.com" },
    update: {},
    create: { email: "editor@gebvienna.com", passwordHash: await bcrypt.hash("editor123", 12), name: "Editor", role: "editor" },
  });

  // Designers
  const designers = [
    { name: "GamFratesi", slug: "gamfratesi", country: "Danimarca", bio: "Fondato nel 2006 da Stine Gam e Enrico Fratesi, lo studio danese-italiano combina la tradizione artigianale danese con la razionalità italiana." },
    { name: "Front", slug: "front", country: "Svezia", bio: "Duo di designer svedesi noto per processi di design sperimentali e un approccio unico alla creazione di oggetti." },
    { name: "Studio Irvine", slug: "studio-irvine", country: "Italia", bio: "Fondato da James Irvine, lo studio milanese lavora su progetti di product e interior design." },
    { name: "Chiara Andreatti", slug: "chiara-andreatti", country: "Italia", bio: "Designer veneta che esplora le connessioni tra artigianato tradizionale e design contemporaneo." },
    { name: "Martino Gamper", slug: "martino-gamper", country: "Italia", bio: "Designer e artista altoatesino noto per il suo approccio sperimentale e la ricerca sui materiali." },
    { name: "LucidiPevere", slug: "lucidipevere", country: "Italia", bio: "Studio fondato da Paolo Lucidi e Luca Pevere, tra i più innovativi nel design contemporaneo italiano." },
    { name: "Luca Nichetto", slug: "luca-nichetto", country: "Italia", bio: "Designer e architetto veneziano con studio a Stoccolma, noto per prodotti eleganti e funzionali." },
    { name: "Nigel Coates", slug: "nigel-coates", country: "UK", bio: "Architetto e designer britannico, figura chiave della scena creativa londinese degli anni '80." },
    { name: "Seid+", slug: "seid", country: "Italia", bio: "Studio di design italiano specializzato in arredi e complementi dal carattere contemporaneo." },
    { name: "Nendo", slug: "nendo", country: "Giappone", bio: "Studio fondato da Oki Sato, celebre per i design minimalisti e le soluzioni ingegnose." },
    { name: "Gebrüder Thonet Vienna", slug: "gtv", country: "Austria", bio: "Il design originale della casa, custode della tradizione del legno curvato dal 1853." },
  ];

  const designerMap: Record<string, string> = {};
  for (const d of designers) {
    const created = await prisma.designer.create({ data: d });
    designerMap[d.name] = created.id;
  }

  // Products
  const products = [
    { name: "ALLEGORY DESK", slug: "allegory-desk", designerName: "GamFratesi", category: "COMPLEMENTI", imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=600&fit=crop" },
    { name: "AMPLE", slug: "ample", designerName: "Seid+", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=600&fit=crop" },
    { name: "AMPLE BISTRO TABLES", slug: "ample-bistro-tables", designerName: "Studio Irvine", category: "TAVOLI", imageUrl: "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=600&h=600&fit=crop" },
    { name: "AMPLE OUTDOOR", slug: "ample-outdoor", designerName: "Seid+", category: "OUTDOOR", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop" },
    { name: "ARCADIA", slug: "arcadia", designerName: "Front", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=600&fit=crop" },
    { name: "ARCH CLOTHES VALET", slug: "arch-clothes-valet", designerName: "GamFratesi", category: "COMPLEMENTI", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=600&fit=crop" },
    { name: "ARCH COFFEE TABLE", slug: "arch-coffee-table", designerName: "Front", category: "TAVOLI", imageUrl: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=600&h=600&fit=crop" },
    { name: "ARCH DINING TABLE", slug: "arch-dining-table", designerName: "Front", category: "TAVOLI", imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?w=600&h=600&fit=crop" },
    { name: "BEAULIEU", slug: "beaulieu", designerName: "Chiara Andreatti", category: "IMBOTTITI", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop", isFeatured: true },
    { name: "BISTROSTUHL", slug: "bistrostuhl", designerName: "Gebrüder Thonet Vienna", category: "CLASSICI", imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=600&fit=crop" },
    { name: "BODYSTUHL", slug: "bodystuhl", designerName: "Nigel Coates", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&h=600&fit=crop" },
    { name: "BOOMERANG", slug: "boomerang", designerName: "Martino Gamper", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=600&h=600&fit=crop" },
    { name: "BRANDY", slug: "brandy", designerName: "Studio Irvine", category: "TAVOLI", imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=600&h=600&fit=crop" },
    { name: "BREZEL", slug: "brezel", designerName: "LucidiPevere", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=600&fit=crop" },
    { name: "CHIGNON", slug: "chignon", designerName: "LucidiPevere", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&h=600&fit=crop" },
    { name: "CIRQUE", slug: "cirque", designerName: "Martino Gamper", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&h=600&fit=crop" },
    { name: "CLOUD", slug: "cloud", designerName: "Luca Nichetto", category: "IMBOTTITI", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop", isNew: true },
    { name: "KIPFERL", slug: "kipferl", designerName: "Nendo", category: "IMBOTTITI", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop", isFeatured: true, isNew: true },
    { name: "LIKE MIKE", slug: "like-mike", designerName: "Chiara Andreatti", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=600&fit=crop", isFeatured: true },
    { name: "LEHNSTUHL", slug: "lehnstuhl", designerName: "Gebrüder Thonet Vienna", category: "CLASSICI", imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=600&fit=crop" },
    { name: "N.14", slug: "n-14", designerName: "Gebrüder Thonet Vienna", category: "CLASSICI", imageUrl: "https://images.unsplash.com/photo-1551298370-9d3d53740c72?w=600&h=600&fit=crop" },
    { name: "FAUTEUIL", slug: "fauteuil", designerName: "Gebrüder Thonet Vienna", category: "CLASSICI", imageUrl: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&h=600&fit=crop" },
    { name: "SPLIT", slug: "split", designerName: "Nendo", category: "SEDUTE", imageUrl: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=600&h=600&fit=crop" },
    { name: "TARGA", slug: "targa", designerName: "GamFratesi", category: "COMPLEMENTI", imageUrl: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=600&fit=crop" },
  ];

  for (const p of products) {
    const designerId = designerMap[p.designerName] || null;
    await prisma.product.create({
      data: {
        ...p,
        designerId,
        description: "Un design che unisce tradizione viennese e innovazione contemporanea.",
        isActive: true,
      },
    });
  }

  // Stores
  const stores = [
    { name: "MOBILNOVO", type: "STORE", address: "Via Anastasio II, 113", city: "Roma", country: "Italia", phone: "+39 06 6381104", email: "mobilnovo@mobilnovo.it", latitude: 41.9028, longitude: 12.4364 },
    { name: "OFFICINA CREATIVA", type: "STORE", address: "Via Flaminia, 855", city: "Roma", country: "Italia", phone: "+39 06 333 6316", email: "info@officinacreativadesign.it", latitude: 41.9406, longitude: 12.4747 },
    { name: "MIA HOME DESIGN GALLERY", type: "STORE", address: "Via di Ripetta, 224", city: "Roma", country: "Italia", phone: "+39 06 97841892", email: "info@galleriamia.it", latitude: 41.9109, longitude: 12.4755 },
    { name: "DESIGN REPUBLIC", type: "STORE", address: "Via Tortona, 37", city: "Milano", country: "Italia", phone: "+39 02 4229 4508", email: "info@designrepublic.com", latitude: 45.4497, longitude: 9.1647 },
    { name: "SPAZIO ROSSANA ORLANDI", type: "STORE", address: "Via Matteo Bandello, 14-16", city: "Milano", country: "Italia", phone: "+39 02 467 4471", email: "info@rossanaorlandi.com", latitude: 45.4651, longitude: 9.1724 },
    { name: "ROCHE BOBOIS PARIS", type: "STORE", address: "196 Boulevard Saint-Germain", city: "Parigi", country: "Francia", phone: "+33 1 46 34 74 73", email: "paris@rochebobois.com", latitude: 48.8566, longitude: 2.3322 },
    { name: "ARAM STORE LONDON", type: "STORE", address: "110 Drury Lane", city: "Londra", country: "UK", phone: "+44 20 7557 7557", email: "info@aram.co.uk", latitude: 51.5149, longitude: -0.1209 },
    { name: "WOHNDESIGN BERLIN", type: "STORE", address: "Kantstraße 17", city: "Berlino", country: "Germania", phone: "+49 30 3151 4640", email: "info@wohndesign-berlin.de", latitude: 52.5063, longitude: 13.3125 },
  ];

  const agents = [
    { name: "AGENTE NORD ITALIA", type: "AGENT", address: "Via della Repubblica, 15", city: "Torino", country: "Italia", phone: "+39 011 555 1234", email: "nord@gtvagenti.it", latitude: 45.0703, longitude: 7.6869 },
    { name: "AGENTE SUD ITALIA", type: "AGENT", address: "Via Toledo, 200", city: "Napoli", country: "Italia", phone: "+39 081 555 5678", email: "sud@gtvagenti.it", latitude: 40.8518, longitude: 14.2681 },
    { name: "AGENTE CENTRO ITALIA", type: "AGENT", address: "Piazza della Signoria, 5", city: "Firenze", country: "Italia", phone: "+39 055 555 9012", email: "centro@gtvagenti.it", latitude: 43.7696, longitude: 11.2558 },
    { name: "AGENTE FRANCIA", type: "AGENT", address: "Rue du Faubourg Saint-Honoré, 112", city: "Parigi", country: "Francia", phone: "+33 1 42 56 78 90", email: "france@gtvagenti.com", latitude: 48.8714, longitude: 2.3146 },
  ];

  for (const s of [...stores, ...agents]) {
    await prisma.pointOfSale.create({ data: s });
  }

  // Projects
  const projects = [
    { name: "A.D. 1768 BOUTIQUE HOTEL", slug: "ad-1768-boutique-hotel", type: "HOTELLERIE", country: "Italia", city: "Roma", year: 2023, architect: "Studio Roma Architects", imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=600&fit=crop" },
    { name: "ALLBRIGHT MAYFAIR", slug: "allbright-mayfair", type: "BISTROT_RESTAURANT", country: "UK", city: "Londra", year: 2022, imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=600&fit=crop" },
    { name: "ATLAS BRASSERIE & CAFE", slug: "atlas-brasserie-cafe", type: "BISTROT_RESTAURANT", country: "Svezia", city: "Stoccolma", year: 2023, imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=600&fit=crop" },
    { name: "BIBLOS BEACH RESORT ALACATI", slug: "biblos-beach-resort", type: "HOTELLERIE", country: "Turchia", city: "Alacati", year: 2021, imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=600&fit=crop" },
    { name: "CAFE COMERCIAL", slug: "cafe-comercial", type: "BISTROT_RESTAURANT", country: "Spagna", city: "Madrid", year: 2022, imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=600&fit=crop" },
    { name: "CAFE DU TROCADERO", slug: "cafe-du-trocadero", type: "BISTROT_RESTAURANT", country: "Francia", city: "Parigi", year: 2023, imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600&h=600&fit=crop" },
    { name: "BLUEORANGE BANK HQ", slug: "blueorange-bank", type: "SPAZI_CULTURALI", country: "Lettonia", city: "Riga", year: 2022, imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=600&fit=crop" },
    { name: "VILLA SERENA", slug: "villa-serena", type: "RESIDENZIALE", country: "Italia", city: "Como", year: 2024, architect: "Andrea Maffei Architects", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=600&fit=crop" },
    { name: "BERNADETTE ZURICH", slug: "bernadette-zurich", type: "BISTROT_RESTAURANT", country: "Svizzera", city: "Zurigo", year: 2023, imageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&h=600&fit=crop" },
    { name: "PALAZZO DELLE ARTI", slug: "palazzo-delle-arti", type: "SPAZI_CULTURALI", country: "Italia", city: "Venezia", year: 2024, imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=600&fit=crop" },
  ];

  for (const p of projects) {
    await prisma.project.create({ data: { ...p, description: "Un progetto che celebra l'eccellenza del design GTV.", isActive: true } });
  }

  // Campaigns
  const campaigns = [
    { name: "Vienna Heritage", slug: "vienna-heritage", subtitle: "L'eredità viennese nel design contemporaneo", year: 2024, imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop", description: "Una campagna che celebra le radici viennesi del brand attraverso immagini evocative e storytelling." },
    { name: "Curvature", slug: "curvature", subtitle: "La bellezza della curva", year: 2023, imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=500&fit=crop", description: "Esplorazione della tecnica del legno curvato, firma indelebile del marchio dal 1853." },
    { name: "Living Spaces", slug: "living-spaces", subtitle: "Abitare il design", year: 2024, imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=500&fit=crop", description: "Ambienti domestici trasformati dalla presenza di arredi GTV." },
    { name: "Outdoor Living", slug: "outdoor-living", subtitle: "Design all'aria aperta", year: 2024, imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop", description: "La nuova collezione outdoor che porta l'eleganza GTV negli spazi esterni." },
  ];

  for (const c of campaigns) {
    await prisma.campaign.create({ data: { ...c, isActive: true } });
  }

  // Awards
  const awards = [
    { name: "Red Dot Design Award", productName: "KIPFERL", year: 2024, organization: "Red Dot", description: "Best of the Best nella categoria furniture design." },
    { name: "Compasso d'Oro", productName: "ARCADIA", year: 2023, organization: "ADI", description: "Menzione d'onore per l'innovazione nella tradizione." },
    { name: "Wallpaper* Design Award", productName: "CLOUD", year: 2024, organization: "Wallpaper*", description: "Best sofa design of the year." },
    { name: "German Design Award", productName: "ALLEGORY DESK", year: 2023, organization: "German Design Council", description: "Winner nella categoria Office & Workspace." },
    { name: "iF Design Award", productName: "SPLIT", year: 2024, organization: "iF International Forum Design", description: "Gold award per l'eccezionale qualità del design." },
    { name: "Elle Decor International Design Award", productName: "BEAULIEU", year: 2023, organization: "Elle Decor", description: "Furniture of the year." },
    { name: "Archiproducts Design Award", productName: "CHIGNON", year: 2022, organization: "Archiproducts", description: "Vincitore nella categoria seating." },
  ];

  for (const a of awards) {
    await prisma.award.create({ data: { ...a, isActive: true } });
  }

  // Finishes
  const finishes = [
    { name: "Faggio Naturale", slug: "faggio-naturale", code: "FN01", category: "LEGNO", colorHex: "#C4A882" },
    { name: "Noce Canaletto", slug: "noce-canaletto", code: "NC01", category: "LEGNO", colorHex: "#5C3D2E" },
    { name: "Rovere Sbiancato", slug: "rovere-sbiancato", code: "RS01", category: "LEGNO", colorHex: "#D4C5A9" },
    { name: "Frassino Tinto Nero", slug: "frassino-tinto-nero", code: "FTN01", category: "LEGNO", colorHex: "#2C2C2C" },
    { name: "Frassino Naturale", slug: "frassino-naturale", code: "FNA01", category: "LEGNO", colorHex: "#B8A88A" },
    { name: "Laccato Bianco", slug: "laccato-bianco", code: "LB01", category: "LACCATO", colorHex: "#FFFFFF" },
    { name: "Laccato Nero", slug: "laccato-nero", code: "LN01", category: "LACCATO", colorHex: "#000000" },
    { name: "Laccato Rosso", slug: "laccato-rosso", code: "LR01", category: "LACCATO", colorHex: "#8B0000" },
    { name: "Ottone Satinato", slug: "ottone-satinato", code: "OS01", category: "METALLO", colorHex: "#B5A642" },
    { name: "Cromo Lucido", slug: "cromo-lucido", code: "CL01", category: "METALLO", colorHex: "#C0C0C0" },
    { name: "Rame Brunito", slug: "rame-brunito", code: "RB01", category: "METALLO", colorHex: "#8B4513" },
    { name: "Pelle Cognac", slug: "pelle-cognac", code: "PC01", category: "PELLE", colorHex: "#9A4A2F" },
    { name: "Pelle Nera", slug: "pelle-nera", code: "PN01", category: "PELLE", colorHex: "#1A1A1A" },
    { name: "Tessuto Grigio Chiaro", slug: "tessuto-grigio-chiaro", code: "TGC01", category: "TESSUTO", colorHex: "#A8A8A8" },
    { name: "Tessuto Blu Notte", slug: "tessuto-blu-notte", code: "TBN01", category: "TESSUTO", colorHex: "#191970" },
    { name: "Velluto Verde", slug: "velluto-verde", code: "VV01", category: "TESSUTO", colorHex: "#2E4F3E" },
  ];

  for (const f of finishes) {
    await prisma.finish.create({ data: { ...f, isActive: true } });
  }

  // Hero Slides
  const heroSlides = [
    { title: "Un omaggio alla tradizione viennese", subtitle: "Kipferl by Nendo", ctaText: "Scopri il prodotto", ctaLink: "/prodotti/kipferl", imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=2560&h=1707&fit=crop&q=90", sortOrder: 0 },
    { title: "Born in Vienna. Made in Italy.", subtitle: "Scopri il mondo GTV", ctaText: "Scopri di più", ctaLink: "/mondo-gtv", imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=2560&h=1707&fit=crop&q=90", sortOrder: 1 },
    { title: "L'arte del legno curvato", subtitle: "Una tradizione dal 1853", ctaText: "Esplora la collezione", ctaLink: "/prodotti", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=2560&h=1707&fit=crop&q=90", sortOrder: 2 },
  ];

  for (const h of heroSlides) {
    await prisma.heroSlide.create({ data: { ...h, isActive: true, position: "center" } });
  }

  // Languages
  const languages = [
    { code: "it", name: "Italiano", nativeName: "Italiano", flag: "🇮🇹", isDefault: true, sortOrder: 0 },
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", isDefault: false, sortOrder: 1 },
    { code: "de", name: "Tedesco", nativeName: "Deutsch", flag: "🇩🇪", isDefault: false, sortOrder: 2 },
    { code: "fr", name: "Francese", nativeName: "Français", flag: "🇫🇷", isDefault: false, sortOrder: 3 },
  ];

  for (const l of languages) {
    await prisma.language.create({ data: { ...l, isActive: true } });
  }

  // Sample page views (last 30 days)
  const paths = ["/", "/prodotti", "/progetti", "/mondo-gtv", "/professionisti", "/contatti", "/contatti/rete-vendita", "/prodotti/kipferl", "/prodotti/beaulieu", "/prodotti/cloud"];
  const now = Date.now();
  for (let day = 0; day < 30; day++) {
    const viewsForDay = Math.floor(Math.random() * 40) + 5;
    for (let v = 0; v < viewsForDay; v++) {
      const randomPath = paths[Math.floor(Math.random() * paths.length)];
      await prisma.pageView.create({
        data: {
          path: randomPath,
          createdAt: new Date(now - day * 86400000 - Math.random() * 86400000),
        },
      });
    }
  }

  // Sample contact submissions
  const contacts = [
    { name: "Marco Rossi", email: "marco.rossi@email.it", subject: "Richiesta catalogo", message: "Vorrei ricevere il catalogo completo dei vostri prodotti.", type: "general" },
    { name: "Anna Bianchi", email: "anna.bianchi@email.it", subject: "Collaborazione designer", message: "Sono una designer emergente e vorrei proporre una collaborazione.", type: "collaboration" },
    { name: "Pierre Dupont", email: "pierre@email.fr", subject: "Punto vendita Parigi", message: "Cerco informazioni sul vostro punto vendita a Parigi.", type: "sales" },
    { name: "Studio Architettura XYZ", email: "studio@xyz.it", subject: "Progetto hotel", message: "Stiamo arredando un boutique hotel e siamo interessati ai vostri prodotti.", type: "professional" },
    { name: "Laura Verdi", email: "laura.verdi@email.it", subject: "Informazioni prodotto KIPFERL", message: "Vorrei informazioni su dimensioni e finiture disponibili per il divano KIPFERL.", type: "general", isRead: true },
  ];

  for (const c of contacts) {
    await prisma.contactSubmission.create({ data: c });
  }

  // Newsletter subscribers
  const emails = ["mario@email.it", "giulia@email.it", "luca@email.it", "francesca@email.it", "alessandro@email.it", "valentina@email.it", "andrea@email.it"];
  for (const email of emails) {
    await prisma.newsletterSubscriber.create({ data: { email } });
  }

  console.log("✅ Seed completed successfully!");
  console.log("   - Admin users: 2");
  console.log("   - Designers:", designers.length);
  console.log("   - Products:", products.length);
  console.log("   - Stores:", stores.length);
  console.log("   - Agents:", agents.length);
  console.log("   - Projects:", projects.length);
  console.log("   - Campaigns:", campaigns.length);
  console.log("   - Awards:", awards.length);
  console.log("   - Finishes:", finishes.length);
  console.log("   - Hero slides:", heroSlides.length);
  console.log("   - Languages:", languages.length);
  console.log("   - Page views: ~600");
  console.log("   - Contacts:", contacts.length);
  console.log("   - Newsletter:", emails.length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
