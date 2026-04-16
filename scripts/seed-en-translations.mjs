// Seeds/updates all English UI string overrides in the DB.
// Run on server:  node scripts/seed-en-translations.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EN = {
  // menu
  "menu.products": "PRODUCTS",
  "menu.products.all": "ALL PRODUCTS",
  "menu.products.complementi": "COMPLEMENTS",
  "menu.products.classici": "CLASSICS",
  "menu.products.imbottiti": "UPHOLSTERED",
  "menu.products.outdoor": "OUTDOOR",
  "menu.products.sedute": "SEATING",
  "menu.products.tavoli": "TABLES",
  "menu.projects": "PROJECTS",
  "menu.projects.all": "ALL PROJECTS",
  "menu.projects.bistrot": "BISTROT & RESTAURANT",
  "menu.projects.hotellerie": "HOTELS",
  "menu.projects.cultural": "CULTURAL SPACES",
  "menu.projects.residential": "RESIDENTIAL",
  "menu.world": "GTV WORLD",
  "menu.world.manifesto": "BRAND MANIFESTO",
  "menu.world.heritage": "HERITAGE",
  "menu.world.wood": "WOOD BENDING",
  "menu.world.sustainability": "SUSTAINABILITY",
  "menu.world.designers": "DESIGNERS & AWARDS",
  "menu.world.experience": "GTV EXPERIENCE",
  "menu.campaigns": "CAMPAIGNS & VIDEOS",
  "menu.news": "NEWS & PRESS",
  "menu.professionals": "PROFESSIONALS",
  "menu.professionals.custom": "CUSTOM REALIZATIONS",
  "menu.professionals.catalogs": "CATALOGS",
  "menu.professionals.tech": "TECHNICAL MATERIAL",
  "menu.contact": "CONTACT",
  "menu.contact.sales": "SALES NETWORK",
  "menu.contact.collab": "NEW DESIGNER COLLABORATIONS",
  "menu.contact.press": "PRESS OFFICE",
  "menu.contact.info": "INFO REQUEST",
  "menu.contact.landing": "LANDING PAGE",

  // nav
  "nav.home": "Home",
  "nav.products": "Products",
  "nav.designers": "Designers",
  "nav.projects": "Projects",
  "nav.campaigns": "Campaigns and Videos",
  "nav.news": "News and Press",
  "nav.world": "GTV World",
  "nav.professionals": "Professionals",
  "nav.contact": "Contact",

  // footer
  "footer.copyright": "© Gebrüder Thonet Vienna",
  "footer.privacy": "Privacy Policy",
  "footer.cookies": "Cookie Policy",
  "footer.newsletter.title": "For design lovers",
  "footer.newsletter.subtitle": "Receive exclusive news and inspiration.",
  "footer.newsletter.button": "Subscribe",
  "footer.newsletter.placeholder": "Your email",
  "footer.newsletter.success": "Thank you for subscribing!",
  "footer.newsletter.consent": "I accept the",
  "footer.language": "Language",
  "footer.col.explore": "Explore",
  "footer.col.info": "Information",
  "footer.col.follow": "Follow us",
  "footer.terms": "General\nTerms of Sale",
  "footer.company.headquarters": "Headquarters Gebrüder Thonet Vienna GmbH",
  "footer.company.registered": "Registered Office Gebrüder Thonet Vienna GmbH",
  "footer.company.licencee": "Offices of the trademarks licencee",
  "footer.bottom.copyright": "Copyright 2025 © GEBRUDER THONET VIENNA GMBH",
  "footer.bottom.disclaimer": "Please note that the use of the trademark and the company name \"Gebrüder Thonet Vienna\" in the United States, and the use of the \"Gebrüder Thonet Vienna\" trademark in Germany, are subject to restrictions due to agreements with other companies. For further information please contact info@gebruederthonetvienna.it.",

  // search panel
  "search.title": "What are you looking for?",
  "search.placeholder": "Type your search term here",
  "search.button": "Start the search",
  "search.empty": "No results found for",
  "search.group.products": "Products",
  "search.group.projects": "Projects",
  "search.group.designers": "Designers",
  "search.group.campaigns": "Campaigns",
  "search.group.awards": "Awards",

  // common
  "common.discover": "Discover more",
  "common.discover_product": "Discover the product",
  "common.contact_us": "Contact us",
  "common.read_more": "Read more",
  "common.download": "Download",
  "common.view_all": "View all",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.back": "Back",
  "common.close": "Close",
  "common.share": "Share",
  "common.related": "You may also be interested in",
  "common.breadcrumb_home": "Home",
  "common.discover_world": "Discover the GTV world",
  "common.best_projects": "Our finest projects",
  "common.discover_more": "Discover more",
  "common.menu_featured": "Interno Marche | Discover our flagship hotel",

  // home sections
  "home.featured.label": "New product",
  "home.featured.title": "A soft\nand welcoming\nsilhouette",
  "home.spotlight.label": "A design icon",
  "home.spotlight.title": "The timeless\nelegance\nof bent wood",
  "home.wood.title": "The harmony of wood",
  "home.wood.cta": "Discover the art of bent wood",
  "home.banner.title": "Seats that invite you to stay,\nmoments that take shape",
  "home.banner.cta": "Our finest projects",
  "home.born.title": "Born in Vienna.\nMade in Italy.\nDesigned around\nthe world.",
  "home.categories.title": "Heritage designs the future",
  "home.categories.cta": "View all products",

  // form
  "form.name": "Name",
  "form.surname": "Last name",
  "form.email": "Email",
  "form.phone": "Phone",
  "form.company": "Company",
  "form.message": "Message",
  "form.subject": "Subject",
  "form.privacy_consent": "I consent to the processing of my personal data.",
  "form.send": "Send",
  "form.success": "Message sent successfully.",
  "form.error": "An error has occurred. Please try again.",
  "form.required": "Required field",

  // mondo-gtv
  "mondo-gtv.title": "GTV World",
  "mondo-gtv.intro": "GTV World tells the identity of Gebrüder Thonet Vienna: a tradition rooted in 19th-century Vienna, renewed today through collaboration with the most important international design studios. Explore the brand manifesto, the company's history, the bent-wood technique, our commitment to sustainability, designers and awards, up to the Interno Marche Design Hotel experience.",
  "mondo-gtv.breadcrumb": "GTV World",

  // brand-manifesto
  "brand-manifesto.subtitle": "Brand manifest",
  "brand-manifesto.title": "Born in Vienna.\nMade in Italy.\nDesigned around the world.",
  "brand-manifesto.intro": "Each word reflects a fundamental part of our essence: our historic origin, artisanal excellence and our global vision. It is not merely a claim, but a journey across time, culture and traditions, telling the story of a brand born in one corner of Europe, expressed in another, and projected toward the entire world. Each of our products is a symbol of this fusion: a union between past and future, craftsmanship and contemporary design, local and global.",
  "brand-manifesto.heritage.label": "Our Heritage",
  "brand-manifesto.heritage.title": "Born in Vienna",
  "brand-manifesto.heritage.description": "The Viennese tradition, steeped in art and ingenuity, is our foundation, a heritage that accompanies us in every creation. But we do not stop there: our craft is never static, it evolves and renews itself to tell new stories.",
  "brand-manifesto.heritage.cta": "Our origins →",
  "brand-manifesto.production.label": "The Production",
  "brand-manifesto.production.title": "Made in Italy",
  "brand-manifesto.production.description": "The perfect encounter between our heritage and Italian artisanal mastery. In Italy, where design is a daily art, every product is born from the meeting of precious materials and craft skills that define a timeless quality. Here, beauty merges with functionality, creating pieces that become iconic and enduring, destined to last.",
  "brand-manifesto.wood-harmony.title": "The harmony of wood",
  "brand-manifesto.wood-harmony.cta": "Discover the art of bent wood →",
  "brand-manifesto.designers.label": "Our Designers",
  "brand-manifesto.designers.title": "Designed around the world",
  "brand-manifesto.designers.description": "We collaborate with some of the greatest masters of contemporary design, from diverse cultures and backgrounds, to reinterpret our heritage with an ever-fresh perspective. Each piece is the result of a dialogue between past and future, between artisanal know-how and aesthetic innovation, giving rise to collections that fit naturally into international contexts: a story that continues to evolve, without ever losing its identity.",
  "brand-manifesto.breadcrumb": "Brand Manifesto",

  // heritage
  "heritage.title": "The origins of \"Gebrüder Thonet\"",
  "heritage.family.alt": "Michael Thonet and his five sons",
  "heritage.family.description": "Michael Thonet (1796-1871) and his five sons were the most successful furniture manufacturers of the industrial era. Invited by Austrian Chancellor Metternich, who had seen his products at the Exhibition of the Society of Friends of the Arts in Koblenz, to develop his patent in Austria, in 1842 Michael Thonet left Boppard, Germany, to settle in Vienna, where in 1853 he founded the \"Gebrüder Thonet\" company involving his five sons.",
  "heritage.innovation.title": "Innovation and industrial success",
  "heritage.innovation.p1": "In the capital of the Habsburg Empire, Michael Thonet moved from the technique of glued laminated wood to that of steam-bent solid wood — a chemical and mechanical process of industrial type. Thanks to this innovation he began producing wooden furniture, offering a collection of forms that were both elegant and rational, with a procedure that allowed mass production. Added to this was a distribution and sales system capable of penetrating any market.",
  "heritage.innovation.p2": "During this period, products were born such as the \"N.1\" chair, designed for the famous Schwarzenberg Palace in Vienna, considered the Thonet \"prototype\" chair, from which countless models later derived, up to the \"N.14\" chair.",
  "heritage.expansion.title": "Expansion and transformation",
  "heritage.expansion.description": "Technological awareness at the highest level, the diffusion of products and the company's renown prompted the most important Viennese architects to design new products. Otto Wagner had the furniture for the Postsparkasse made. Adolf Loos created the chair for the Café Museum and devoted himself to design in 1899.",
  "heritage.postwar.p1": "In 1911 the Gebrüder Thonet catalogue counted 860 distinct models. At the end of the Second World War, independent production units remained in various nations, which took on different names: in Austria, homeland of Gebrüder Thonet, it became Thonet-Mundus; among descendants of Michael Thonet were Gebrüder Thonet and Richard Thonet. After the war, starting again from scratch, with few pieces but with great passion and knowledge of furniture.",
  "heritage.postwar.p2": "Gebrüder Thonet Vienna was born precisely from the old Gebrüder Thonet warehouses, starting in 1948. Rebuilt, Richard and Gebrüder Thonet erected a factory in Rethway, Styria, before building their production site in Friedberg in 1952.",
  "heritage.postwar.p3": "In 1976 the company changed its name to Gebrüder Thonet Vienna.",
  "heritage.today.title": "Gebrüder Thonet Vienna today: tradition and innovation",
  "heritage.today.p1": "Recently, Gebrüder Thonet Vienna GmbH (GTV) has developed its business between tradition and innovation, continuity and renewal, giving life to an articulated production programme that aims first of all to recover — as re-editions — a series of historical objects created by Gebrüder Thonet.",
  "heritage.today.p2": "GTV embodies contemporary furniture, combining tradition and innovation. Advanced techniques, innovative materials and contemporary design characterise its projects, transforming classical heritage into new solutions. Icons like the N14 chair, with over 50 million examples produced, continue to inspire. GTV looks to the future, reinterpreting the past to create current and versatile collections.",
  "heritage.coin.title": "The GTV \"Coin\"",
  "heritage.coin.description": "The inimitable value, tangible and intangible, in the structure of every single piece: a distinctive emblem that attests to authenticity, originality and quality, achieved through a balance between industry and skilled craftsmanship, between the heritage of the past and detailed execution. The coin bearing the brand's effigy, which historically was applied internally at the Thonet production sites, now appears on all products.",
  "heritage.breadcrumb": "Heritage",

  // curvatura-legno
  "curvatura-legno.title": "Wood bending",
  "curvatura-legno.intro": "The technique of wood bending is an ancient method, present in the craftsmanship of various civilisations, but long kept in the background due to its limited advantage in terms of productivity.",
  "curvatura-legno.technique.title": "The Technique",
  "curvatura-legno.technique.p1": "Michael Thonet's intuition arose from the observation that fresh wood is more flexible than dry wood. Starting from this consideration, Thonet and some of his contemporaries experimented with bending packages of thin sheets of wood, immersed in boiling glue and then dried in rigid moulds.",
  "curvatura-legno.technique.p2": "However, this solution did not guarantee the strength of the product due to the fragility of the adhesive. To overcome this problem, Thonet decided to work exclusively on the physical properties of the wood, completely eliminating glue from his processes. To obtain greater flexibility of the material — even after drying — he increased slippage between the fibres by exposing them in a highly humid environment.",
  "curvatura-legno.patent.title": "The Patent",
  "curvatura-legno.patent.p1": "In 1842, Michael Thonet patented the process that made him famous throughout the world: strips of wood (preferably beech, thanks to its long, regular and knot-free fibre) were turned, placed in an autoclave to absorb moisture, forcefully bent and secured in metal moulds, then dried. After the pieces were finished, the \"Vienna chair\" was assembled, a distinctive element of the company.",
  "curvatura-legno.patent.p2": "A true industrial process, accompanied by the progressive elimination of ornaments and joints in favour of rigorous lines and greater simplification of the assembly elements.",
  "curvatura-legno.conclusion": "Formal elegance, solidity and lightness have decreed the success of the company, which in a few years opened production facilities all over the world. A unique production method, rooted in a history rich in inspiration, which today is renewed through the choice of high-quality materials. The woods, selected for strength and versatility, combine with fine fabrics, enriching the collection with refined chromatic nuances.",
  "curvatura-legno.breadcrumb": "Wood Bending",

  // sostenibilita
  "sostenibilita.title": "Sustainability",
  "sostenibilita.subtitle": "Environmental protection: a challenge for the future, an opportunity for GTV.",
  "sostenibilita.intro.p1": "Year after year, GTV has developed a growing sensitivity towards environmental issues and, with a view to continuous improvement, complies with regulations that favour the use of sustainable processes and materials. A tangible sign, a firm point that traces a path oriented to continuity — including ethical continuity — between the production cycle and the product.",
  "sostenibilita.intro.p2": "A concrete commitment by the company to offer real guarantees in terms of environmental sustainability and consumer health protection, with the aim of building a relationship of trust based on an integrated approach to sustainable development.",
  "sostenibilita.fsc.title": "FSC-Certified Wood (C123220)",
  "sostenibilita.fsc.p1": "For the production of its collections, Gebrüder Thonet Vienna GmbH chooses to use FSC-certified wood (Forest Stewardship Council), the leading international certification system that guarantees the wood comes from forests managed according to strict environmental, social and economic standards.",
  "sostenibilita.fsc.p2": "In addition to this choice, GTV adopts less visible but equally fundamental processes for sustainability. The company has in fact begun the conversion of the painting process, replacing polyurethane paints with water-based ones, thus reducing emissions into the atmosphere and ensuring greater protection for the personnel involved.",
  "sostenibilita.fsc.p3": "In 2021, GTV inaugurated a new Green project, introducing entirely sustainable products, including the new Beaulieu chair, designed with a particular focus on sustainability.",
  "sostenibilita.breadcrumb": "Sustainability",

  // designer-premi
  "designer-premi.title": "Designers and awards",
  "designer-premi.intro": "GTV collaborates with talented designers to reinterpret tradition through a contemporary language. This commitment to research and innovation is recognised internationally, with awards and mentions that testify to the brand's excellence in design.",
  "designer-premi.designers.title": "Designers",
  "designer-premi.awards.title": "Awards",
  "designer-premi.breadcrumb": "Designers and Awards",

  // gtv-experience
  "gtv-experience.hero.title": "GTV Experience\nInterno Marche Design Hotel",
  "gtv-experience.intro.title": "GTV furnishes the prestigious spaces of Interno Marche",
  "gtv-experience.intro.p1": "Gebrüder Thonet Vienna GmbH (GTV) furnishes the prestigious spaces of Interno Marche, the first Design Experience Hotel that tells the story of 100 years of design history. In the heart of the Marche region, in a beautiful setting of small villages and gentle hills, the dream hotel of Franco Moschini — patron and current president of Gebrüder Thonet Vienna — was born. Michele De Lucchi, GamFratesi, Vico Magistretti, Front and Nendo are some of the celebrated names of architects and designers who have collaborated with GTV and who inspire some of the rooms of the design hotel, enriched by their most iconic works.",
  "gtv-experience.intro.p2": "The refined spaces such as the lobby, the lounge bar and the patio feature some of the most famous and contemporary creations of the brand, such as the Loie lounge chair by Chiara Andreatti and the Targa sofa by GamFratesi, together with the Arch Coffee Table by Front. The Ample chair and the bistrot tables, designed by Nichetto Studio, recreate the unmistakable refined atmosphere of the historic Viennese bistrot, furnishing the restaurant and patio with the new outdoor version of the Ample family. With this prestigious supply, Gebrüder Thonet Vienna reconfirms itself as the ideal partner for sophisticated contract projects around the world, thanks to the refined elegance of the lines and the high design quality of its creations.",
  "gtv-experience.stories.title": "Stories, visions, inspirations",
  "gtv-experience.stories.description": "Interno Marche is the fruit of a vision that weaves together history, art and design. A journey to discover Villa Gabrielli, a historic residence in the heart of the Marche hills, where every material and furnishing choice tells the same passion for excellence.",
  "gtv-experience.villa.title": "The rebirth of Villa Gabrielli",
  "gtv-experience.villa.description": "Villa Gabrielli, a late-Liberty jewel, a symbol of the development of the city of Tolentino in the last century. In 1922 the building was initially a factory and the residence of the entrepreneur Nazareno Gabrielli, creator of the famous Italian fashion brand. After him, it became the first production site of the new Poltrona Frau and the residence of Franco Moschini. The heritage of the place is preserved in the Interno Marche project, which has thoughtfully rethought and recreated these spaces of work, family and lived life, and has thus returned them to the city.",
  "gtv-experience.lobby.title": "Lobby",
  "gtv-experience.lobby.description": "The foyer is the point of arrival and departure, an expressive and highly impactful environment, where GTV's iconic seating welcomes guests in an atmosphere suspended between classic and contemporary.",
  "gtv-experience.corridors.title": "The corridors",
  "gtv-experience.corridors.description": "The corridors become exhibition spaces, intimate galleries where GTV creations punctuate the journey, transforming a simple passageway into an aesthetic experience. Design pieces that dialogue with surfaces and natural light.",
  "gtv-experience.rooms.title": "30 iconic rooms.",
  "gtv-experience.live.title": "Live the GTV Experience",
  "gtv-experience.live.description": "Interno Marche is an invitation to experience design in its most authentic dimension. Discover the charm of the GTV collections immersed in a unique context, where every room tells a different story and every detail is designed to move.",
  "gtv-experience.breadcrumb": "GTV Experience",

  // prodotti
  "prodotti.title": "Products",
  "prodotti.description": "Gebrüder Thonet Vienna products combine tradition and innovation in iconic, timeless forms. Visual lightness, solidity and artisanal details make each piece unique, ideal for residential and contract spaces. Customisable in finishes and materials, they bring elegance and character to any environment.",
  "prodotti.filter.all": "All",
  "prodotti.filter.designer": "Designer",
  "prodotti.filter.category": "Category",
  "prodotti.empty": "No products found for this selection.",
  "prodotti.detail.materials": "Materials",
  "prodotti.detail.dimensions": "Dimensions",
  "prodotti.detail.designer": "Designer",
  "prodotti.detail.year": "Year",
  "prodotti.detail.tech_sheet": "Technical sheet",
  "prodotti.detail.request_info": "Request information",
  "prodotti.breadcrumb": "Products",
  "prodotti.detail.nav.inspiration": "Inspiration",
  "prodotti.detail.nav.designer": "Designer",
  "prodotti.detail.nav.specs": "Technical Specifications",
  "prodotti.detail.nav.projects": "Projects",
  "prodotti.detail.show_more": "Read more",
  "prodotti.detail.show_less": "Show less",
  "prodotti.detail.variants": "Variants",
  "prodotti.detail.find_store": "Find a store",
  "prodotti.detail.tech_section_title": "Technical sheet, 2D, 3D, user instructions, maintenance",
  "prodotti.detail.tech_sheet_download": "Technical sheet",
  "prodotti.detail.dims_unavailable": "Dimensions not available.",
  "prodotti.detail.custom.title": "Custom product dimensions",
  "prodotti.detail.custom.cta": "Contact us for your project",
  "prodotti.detail.projects.title": "Projects featuring this product",

  // progetti
  "progetti.title": "Projects",
  "progetti.description.line1": "A look at our projects around the world.",
  "progetti.description.line2": "From the most refined bistrots to cutting-edge hotels, from cultural spaces to residential contexts, our furnishings help define unmistakable atmospheres.",
  "progetti.description.line3": "In this section we collect a selection of projects that tell how our aesthetic and our history intertwine with the visions of contemporary architects and interior designers.",
  "progetti.filter.all": "All",
  "progetti.filter.country": "Filter by Country",
  "progetti.filter.product": "Filter by product",
  "progetti.empty": "No projects found for this selection.",
  "progetti.breadcrumb": "Projects",

  // campagne-video
  "campagne-video.title": "Campaigns & Videos",
  "campagne-video.filter.all": "All",
  "campagne-video.empty": "No campaigns found for this selection.",
  "campagne-video.breadcrumb": "Campaigns & Videos",

  // news
  "news.title": "News & Press",
  "news.filter.all": "All",
  "news.empty": "No articles found for this selection.",
  "news.breadcrumb": "News & Press",

  // professionisti
  "professionisti.title": "Professionals",
  "professionisti.description": "Gebrüder Thonet Vienna provides architects, interior designers and project managers with the tools to support every phase of the work: complete collection catalogues, technical materials for product specification, and a made-to-measure service for contract, hospitality and residential projects.",
  "professionisti.breadcrumb": "Professionals",

  // cataloghi
  "cataloghi.title": "Catalogues",
  "cataloghi.magazine.title": "Slow Living Magazine",
  "cataloghi.breadcrumb": "Catalogues",

  // materiale-tecnico
  "materiale-tecnico.models.tab": "2D and 3D Models",
  "materiale-tecnico.sheets.tab": "Technical Sheets",
  "materiale-tecnico.sheets.title": "Technical Sheets",
  "materiale-tecnico.models.title": "2D and 3D Models",
  "materiale-tecnico.empty": "No files available.",
  "materiale-tecnico.download.label": "Download",
  "materiale-tecnico.breadcrumb": "Technical Material",

  // realizzazioni-custom
  "realizzazioni-custom.title": "Custom Realizations",
  "realizzazioni-custom.description": "GTV places its know-how at the service of architects and designers for bespoke realisations. From the development of exclusive finishes to the creation of personalised furniture, we offer tailor-made solutions for contract and residential projects. Contact us for a dedicated consultation.",
  "realizzazioni-custom.cta": "Write to us →",
  "realizzazioni-custom.breadcrumb": "Custom Realizations",

  // contatti
  "contatti.title": "Contact",
  "contatti.description": "Choose the section best suited to your enquiry: the sales network to find the closest point of purchase, collaborations to propose new design projects, the press office for media, information requests for any other question, and landing pages dedicated to our events.",
  "contatti.breadcrumb": "Contact",

  // collaborazioni
  "collaborazioni.hero.title": "New designer collaborations",
  "collaborazioni.intro": "GTV is always looking for new visions and talents in design. If you wish to collaborate with us and propose your ideas, send your application through the form below. We are ready to explore new possibilities together.",
  "collaborazioni.success.title": "Thank you!",
  "collaborazioni.success.message": "Your application has been sent successfully.",
  "collaborazioni.submit.label": "Submit your details",
  "collaborazioni.form.firstName": "First name",
  "collaborazioni.form.lastName": "Last name",
  "collaborazioni.form.email": "Email address",
  "collaborazioni.form.company": "Studio name",
  "collaborazioni.form.vatNumber": "VAT number",
  "collaborazioni.form.notes": "Additional information",
  "collaborazioni.form.notes.placeholder": "Anything to add? Enter your notes here",
  "collaborazioni.form.privacy": "I confirm I have read the privacy policy and information on the use of personal data",
  "collaborazioni.form.profiling": "I give consent for profiling activities",
  "collaborazioni.error.privacy": "You must accept the privacy policy to send the message.",
  "collaborazioni.error.profiling": "You must accept profiling to send the message.",
  "collaborazioni.breadcrumb": "New designer collaborations",

  // rete-vendita
  "rete-vendita.hero.title": "Sales network",
  "rete-vendita.tab.store": "Store",
  "rete-vendita.tab.agent": "Agents and Distributors",
  "rete-vendita.search.label": "Find the nearest sales point",
  "rete-vendita.search.placeholder": "Rome, RM, Italy",
  "rete-vendita.search.button": "Start the search",
  "rete-vendita.results.text": "THERE ARE",
  "rete-vendita.results.near": "SALES POINTS NEAR",
  "rete-vendita.empty": "No results",
  "rete-vendita.contact.button": "Contact us",
  "rete-vendita.modal.title": "Contact",
  "rete-vendita.modal.success.title": "Message sent!",
  "rete-vendita.modal.success.message": "They will reply as soon as possible.",
  "rete-vendita.modal.submit": "Send message",
  "rete-vendita.modal.submitting": "Sending...",
  "rete-vendita.form.reason": "Reason for contact",
  "rete-vendita.form.privacy": "I accept the privacy policy",
  "rete-vendita.form.newsletter": "I wish to receive updates and news",

  // richiesta-info
  "richiesta-info.title": "Information Request",
  "richiesta-info.description": "Do you have questions about our products or services? Our team is at your disposal to provide all the information you need. Contact us and we will be happy to respond to your enquiries as quickly as possible.",
  "richiesta-info.cta": "Contact us →",
  "richiesta-info.breadcrumb": "Information Request",

  // ufficio-stampa
  "ufficio-stampa.title": "Press Office",
  "ufficio-stampa.intro": "For press materials, interviews or other official information, please contact us at:",
  "ufficio-stampa.agency": "Agence Melchior",
  "ufficio-stampa.contact1.name": "Debora Agostini:",
  "ufficio-stampa.contact2.name": "Allegra Emilia Amatori:",
  "ufficio-stampa.breadcrumb": "Press Office",
};

async function main() {
  const entries = Object.entries(EN);
  let inserted = 0;
  let updated = 0;

  for (const [key, value] of entries) {
    const existing = await prisma.uiTranslationOverride.findUnique({
      where: { key_languageCode: { key, languageCode: "en" } },
    });
    if (existing) {
      if (existing.value !== value) {
        await prisma.uiTranslationOverride.update({
          where: { id: existing.id },
          data: { value },
        });
        updated++;
      }
    } else {
      await prisma.uiTranslationOverride.create({
        data: { key, languageCode: "en", value },
      });
      inserted++;
    }
  }

  console.log(`Total keys: ${entries.length}`);
  console.log(`Inserted:   ${inserted}`);
  console.log(`Updated:    ${updated}`);
  console.log(`Unchanged:  ${entries.length - inserted - updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
