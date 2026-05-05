/**
 * Rich-content seed: per OGNI prodotto store, genera una marketingDescription
 * ricca (titoletti, grassetto, liste — stile Cafestuhl) + SEO title/desc/keywords.
 *
 * Logica:
 *  - Riusa product.description del catalogo come "anima" del testo
 *  - Aggiunge sezioni standardizzate: storia, materia, dettagli, per chi è pensato, sostenibilità
 *  - Adatta il contenuto in base a categoria/sottocategoria (sedie / tavoli / complementi)
 *  - Aggiorna shortDescription, marketingDescription, seoTitle, seoDescription, seoKeywords
 *
 * Preserva: prodotti che hanno già una marketingDescription "ricca" lunga
 * (>1500 char con sezioni `##` o `###`) — questi sono già manualmente curati.
 */
import { prisma } from "../src/lib/prisma";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shorten(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLen - 40) return cut.substring(0, lastSpace) + "…";
  return cut + "…";
}

interface ProductInfo {
  name: string;
  slug: string;
  designerName: string;
  category: string;
  subcategory: string | null;
  description: string;
  materials: string;
  dimensions: string;
  year: number | null;
}

interface CategoryProfile {
  intro: string;
  materia: string;
  dettagliLista: string[];
  perChi: string;
  finiture: string;
  introTitle: string;
  collocazione: string;
}

function detectCategoryProfile(p: ProductInfo): CategoryProfile {
  const cat = (p.category + " " + (p.subcategory || "")).toUpperCase();

  if (/SEDIA|SEDUTA|SEDIE|POLTRONA|CHAIR|STUHL|LOUNGE/i.test(cat) || /sedia|seduta|poltrona/i.test(p.subcategory || "")) {
    return {
      introTitle: "Una storia di curvatura, oltre un secolo di stile",
      intro:
        `**${p.name}** reinterpreta la tradizione del **bentwood viennese** — quella tecnica di curvatura del legno a vapore che ha definito il linguaggio formale della seduta moderna — con un disegno asciutto e contemporaneo, pensato per gli interni di oggi.`,
      materia: `Ogni ${p.name} nasce da listelli di **faggio europeo** selezionato, sottoposti a curvatura a vapore secondo il metodo industriale ideato da Michael Thonet nel 1830 e perfezionato da Gebrüder Thonet Vienna nei decenni successivi. Il risultato è una struttura **leggera, resistente e silenziosa**, che mantiene memoria della forma anche dopo decenni di utilizzo intensivo.`,
      dettagliLista: [
        "**Schienale curvo** ergonomico, con doppia barra in legno massello",
        "**Seduta** in faggio sagomato o, su richiesta, **impagliata a mano in paglia di Vienna**",
        "**Gambe tornite** con giunzione a tenone passante e collante a base d'acqua",
        "Costruzione testata per uso contract intensivo (test EN 16139)",
      ],
      perChi:
        `${p.name} è la scelta di **ristoranti d'autore, hotel boutique, caffè storici e progetti residenziali** che cercano una seduta leggera, impilabile, certificata per uso contract intensivo e capace di invecchiare con grazia.`,
      finiture:
        "Disponibile in **faggio naturale, tinta noce, tinta nero opaco** e **laccato bianco**, oppure su richiesta nelle finiture custom della collezione GTV.",
      collocazione:
        "Ideale per **sale ristorante, caffè, lobby di hotel, biblioteche, sale conferenze** e ambienti residenziali ricercati. Si abbina a tavoli in legno, marmo e metallo.",
    };
  }

  if (/TAVOLO|SCRITTOIO|DESK|TABLE|CONSOLE/i.test(cat) || /tavolo|scrittoio|consolle|console/i.test(p.subcategory || "")) {
    return {
      introTitle: "Geometria essenziale, materia che dura",
      intro:
        `**${p.name}** porta in scena un equilibrio tra **rigore geometrico e calore della materia**. Il piano e la struttura dialogano in una composizione asciutta, pensata per ambienti residenziali raffinati e progetti contract di carattere.`,
      materia:
        `La struttura di ${p.name} è realizzata in **faggio massello curvato a vapore** o **legno multistrato impiallacciato**, secondo l'iconica tecnica brevettata Thonet. Il piano superiore è disponibile in essenze nobili (rovere, noce canaletto, frassino) o in finiture **laccate opache** ad alta resistenza.`,
      dettagliLista: [
        "**Struttura portante** in faggio massello curvato a vapore",
        "**Piano** in essenza pregiata o laccato opaco",
        "**Giunzioni invisibili** con incastro a tenone, senza viti a vista",
        "Verniciatura a base d'acqua a basso VOC",
        "Versione contract certificata uso intensivo",
      ],
      perChi:
        `${p.name} è pensato per **studi professionali, sale riunioni, sale da pranzo, ingressi e ambienti residenziali** che valorizzano superfici ampie e pulite, dove la materia dialoga con la luce.`,
      finiture:
        "Disponibile con **piano in rovere naturale, noce canaletto, frassino, marmo Carrara** oppure laccato in colorazioni RAL su richiesta. Struttura in **faggio naturale, tinta noce o nero opaco**.",
      collocazione:
        "Ideale per **sale da pranzo, biblioteche, lobby, sale d'attesa, ristoranti e showroom**. Si presta sia ad arredamenti classici sia a contesti contemporanei e minimali.",
    };
  }

  if (/COMPLEMENTO|APPENDIABITI|ATTACCAPANNI|HALL|PORTAUMBRELLA|HOCKER|SGABELLO|STOOL/i.test(cat) || /sgabello|hocker|appendi/i.test(p.subcategory || "")) {
    return {
      introTitle: "Un dettaglio che fa la differenza",
      intro:
        `**${p.name}** è uno di quei complementi che, pur servendo una funzione precisa, riescono a definire il carattere di un ambiente. Disegno essenziale, manifattura artigianale e materiali nobili: una piccola architettura quotidiana firmata Gebrüder Thonet Vienna.`,
      materia:
        `Realizzato in **faggio massello curvato a vapore**, ${p.name} eredita oltre un secolo di sapere costruttivo della tradizione viennese del bentwood. La curvatura del legno a vapore, perfezionata in stabilimento storico, garantisce una resistenza eccezionale e una leggerezza visiva che pochi altri materiali possono offrire.`,
      dettagliLista: [
        "**Struttura** in faggio massello curvato a vapore",
        "**Giunzioni** a tenone passante con collante a base d'acqua",
        "Finitura **naturale, tinta** o **laccata opaca**",
        "Stabile e resistente, pensato per uso quotidiano intensivo",
      ],
      perChi:
        `${p.name} si inserisce naturalmente in **ingressi, salotti, camere da letto, hotel e showroom**, dove un dettaglio ben pensato può fare la differenza nel comfort e nell'estetica complessiva dell'ambiente.`,
      finiture:
        "Disponibile in **faggio naturale, tinta noce, tinta nero opaco** e **laccato bianco** o colori RAL su richiesta.",
      collocazione:
        "Pensato per **ingressi, hall, camere da letto, sale d'attesa e ambienti contract**. Si abbina con discrezione a qualsiasi linguaggio d'arredo, dal classico al contemporaneo.",
    };
  }

  // Default fallback
  return {
    introTitle: "Manifattura viennese, disegno contemporaneo",
    intro:
      `**${p.name}** è espressione contemporanea della tradizione **Gebrüder Thonet Vienna**, dove la curvatura del legno a vapore — tecnica brevettata da Michael Thonet nel 1830 — incontra il linguaggio del design d'autore.`,
    materia:
      `Realizzato in **faggio massello curvato a vapore**, ${p.name} eredita un sapere costruttivo che attraversa due secoli di storia industriale. Ogni pezzo è il risultato di una **lavorazione artigianale** che combina precisione meccanica e finitura a mano.`,
    dettagliLista: [
      "**Materiale principale**: faggio massello curvato a vapore",
      "**Finiture**: a base d'acqua, basso VOC",
      "**Costruzione**: testata per uso contract",
      "**Provenienza**: stabilimento storico in Repubblica Ceca, gestione PEFC",
    ],
    perChi:
      `${p.name} è la scelta di **architetti, interior designer e clienti privati** che cercano arredi capaci di durare nel tempo e invecchiare con grazia, conservando il valore di un oggetto fatto bene.`,
    finiture:
      "Disponibile nelle finiture standard della collezione GTV: **naturale, tinta noce, tinta nero opaco, laccato bianco**.",
    collocazione:
      "Si inserisce armoniosamente in ambienti residenziali, retail e contract.",
  };
}

function buildMarketingMd(p: ProductInfo): string {
  const profile = detectCategoryProfile(p);
  const designerLine = p.designerName && p.designerName.trim().length > 0
    ? `Disegnato da **${p.designerName.trim()}**${p.year ? ` nel ${p.year}` : ""}, fa parte della collezione storica di Gebrüder Thonet Vienna.`
    : "";

  // Catalog description (HTML stripped to plain text, preserved as-is in body)
  const catalogText = p.description ? stripHtml(p.description) : "";
  const catalogParas = catalogText.split(/\n\n+/).map((s) => s.trim()).filter((s) => s.length > 30);

  const sections: string[] = [];

  // 1. Intro section
  sections.push(`## ${profile.introTitle}\n\n${profile.intro}`);
  if (designerLine) sections.push(designerLine);

  // 2. Catalog description (if present, well-paragraphed)
  if (catalogParas.length > 0) {
    sections.push(`### Il progetto\n\n${catalogParas.slice(0, 3).join("\n\n")}`);
  }

  // 3. Materia
  sections.push(`### Materia: faggio massello curvato a vapore\n\n${profile.materia}`);

  // 4. Dettagli costruttivi
  sections.push(`### Dettagli costruttivi\n\n${profile.dettagliLista.map((d) => `- ${d}`).join("\n")}`);

  // 5. Materiali/dimensioni from catalog
  if (p.materials && p.materials.trim().length > 5) {
    sections.push(`### Materiali e finiture\n\n${stripHtml(p.materials).trim()}\n\n${profile.finiture}`);
  } else {
    sections.push(`### Finiture disponibili\n\n${profile.finiture}`);
  }

  if (p.dimensions && p.dimensions.trim().length > 5) {
    const dimText = stripHtml(p.dimensions).trim().replace(/\n+/g, " · ");
    sections.push(`### Dimensioni\n\n${dimText}\n\nDimensioni custom disponibili su richiesta per progetti contract.`);
  }

  // 6. Per chi è pensato
  sections.push(`### Per chi è pensato\n\n${profile.perChi}`);

  // 7. Collocazione
  sections.push(`### Dove si colloca\n\n${profile.collocazione}`);

  // 8. Sostenibilità (boilerplate ma presente)
  sections.push(
    `### Sostenibilità\n\nLegno proveniente da foreste **PEFC certificate**, finiture all'acqua a basso VOC, processi produttivi nello stabilimento storico in Repubblica Ceca. ${p.name} è progettato per durare e — quando un giorno servirà — essere completamente disassemblato e riciclato.`
  );

  // 9. Closing quote
  sections.push(
    `> "Una buona forma non si nota: si abita. ${p.name} ha la grazia di sparire nello spazio e tornare quando serve."`
  );

  return sections.join("\n\n");
}

function buildShort(p: ProductInfo): string {
  const profile = detectCategoryProfile(p);
  const catalogText = p.description ? stripHtml(p.description) : "";
  const firstSentence = catalogText.split(/[.!?]\s+/)[0];

  if (firstSentence && firstSentence.length > 50 && firstSentence.length < 240) {
    return firstSentence + ".";
  }

  // Smart default
  const what = (p.subcategory || p.category || "complemento").toLowerCase().replace(/_/g, " ");
  const articolo = /^[aeiou]/.test(what) ? "Un'" : "Un ";
  const designerBit = p.designerName ? ` firmat${articolo === "Un'" ? "a" : "o"} ${p.designerName}` : "";
  const intro = `${articolo}${what}${designerBit}, parte della collezione Gebrüder Thonet Vienna. ${profile.intro.replace(/\*\*/g, "").replace(/^\*\*[^*]+\*\*\s+/, "")}`;
  return shorten(intro, 220);
}

function buildSeo(p: ProductInfo): { title: string; description: string; keywords: string } {
  const what = p.subcategory || p.category || "Arredo";
  const designerBit = p.designerName ? ` ${p.designerName}` : "";

  const title = shorten(`${p.name} —${designerBit ? ` ${what} di${designerBit}` : ` ${what}`} | Gebrüder Thonet Vienna`, 70);

  const descBase = p.description ? stripHtml(p.description).split(/[.!?]\s+/)[0] : "";
  const description = shorten(
    descBase && descBase.length > 60
      ? `${descBase}. Faggio curvato a vapore, manifattura GTV.`
      : `${p.name}${designerBit ? ` di${designerBit}` : ""}. ${what} in faggio massello curvato a vapore, manifattura Gebrüder Thonet Vienna. Tradizione viennese in chiave contemporanea.`,
    158
  );

  const baseKeys = [
    p.name.toLowerCase(),
    what.toLowerCase(),
    "gebrüder thonet vienna",
    "gtv",
    "thonet",
    "faggio curvato",
    "bentwood",
    "design contract",
    "made in italy",
  ];
  if (p.designerName) baseKeys.push(p.designerName.toLowerCase());
  if (/sedia|chair|stuhl/i.test(what)) baseKeys.push("sedia design", "sedia bistro", "sedia paglia di vienna");
  if (/tavolo|desk|table/i.test(what)) baseKeys.push("tavolo design", "scrivania design");
  const keywords = Array.from(new Set(baseKeys)).slice(0, 14).join(", ");

  return { title, description, keywords };
}

function isAlreadyRich(md: string | null | undefined): boolean {
  if (!md) return false;
  // Considera "già ricca" se ha almeno 1500 char, almeno 2 sezioni ## o ### e almeno una lista
  const hasSections = (md.match(/^#{2,3} /gm) || []).length >= 2;
  const hasList = /^\s*[-*]\s/m.test(md);
  return md.length > 1500 && hasSections && hasList;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, description: true,
      designerName: true, category: true, subcategory: true,
      materials: true, dimensions: true, year: true,
    },
  });

  console.log(`Found ${products.length} active products`);

  let createdSP = 0, updatedSP = 0, createdTr = 0, updatedTr = 0, preserved = 0;

  for (const p of products) {
    const info: ProductInfo = {
      name: p.name,
      slug: p.slug,
      designerName: p.designerName || "",
      category: p.category || "",
      subcategory: p.subcategory,
      description: p.description || "",
      materials: p.materials || "",
      dimensions: p.dimensions || "",
      year: p.year,
    };

    let sp = await prisma.storeProduct.findUnique({ where: { productId: p.id } });
    if (!sp) {
      sp = await prisma.storeProduct.create({
        data: { productId: p.id, isPublished: false },
      });
      createdSP++;
    } else {
      updatedSP++;
    }

    const existingTr = await prisma.storeProductTranslation.findUnique({
      where: { storeProductId_languageCode: { storeProductId: sp.id, languageCode: "it" } },
    });

    if (isAlreadyRich(existingTr?.marketingDescription)) {
      preserved++;
      continue;
    }

    const marketingDescription = buildMarketingMd(info);
    const shortDescription = buildShort(info);
    const seo = buildSeo(info);

    if (existingTr) {
      await prisma.storeProductTranslation.update({
        where: { id: existingTr.id },
        data: {
          shortDescription,
          marketingDescription,
          seoTitle: seo.title,
          seoDescription: seo.description,
          seoKeywords: seo.keywords,
        },
      });
      updatedTr++;
    } else {
      await prisma.storeProductTranslation.create({
        data: {
          storeProductId: sp.id,
          languageCode: "it",
          name: p.name,
          slug: p.slug,
          shortDescription,
          marketingDescription,
          seoTitle: seo.title,
          seoDescription: seo.description,
          seoKeywords: seo.keywords,
          status: "draft",
          isPublished: false,
        },
      });
      createdTr++;
    }
  }

  console.log("");
  console.log(`✅ DONE`);
  console.log(`   StoreProduct created: ${createdSP}`);
  console.log(`   StoreProduct existed: ${updatedSP}`);
  console.log(`   IT translation created: ${createdTr}`);
  console.log(`   IT translation updated: ${updatedTr}`);
  console.log(`   Preserved (already rich): ${preserved}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
