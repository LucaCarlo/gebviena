/**
 * Genera due PDF fattura di esempio (IT e FR) con dati fittizi e li scrive
 * nella cartella padre "gebruederthonetvienna" sul Desktop, così è possibile
 * vedere il layout senza fare un ordine reale.
 *
 *   npx tsx scripts/sample-invoice-pdf.ts
 */
import fs from "fs";
import path from "path";
import { buildOrderPdf, type OrderWithItems } from "../src/lib/order-email";

function mock(lang: "it" | "fr"): OrderWithItems {
  const isFr = lang === "fr";
  return {
    id: "sample",
    orderNumber: "GTV-SAMPLE-0042",
    email: isFr ? "jean.dupont@example.fr" : "mario.rossi@example.it",
    firstName: isFr ? "Jean" : "Mario",
    lastName: isFr ? "Dupont" : "Rossi",
    phone: isFr ? "+33 6 12 34 56 78" : "+39 333 1234567",
    language: lang,
    shippingAddress: JSON.stringify(
      isFr
        ? { street: "15 Rue de Paris", city: "Paris", province: "", postalCode: "75000", country: "France" }
        : { street: "Via Roma 10", city: "Milano", province: "MI", postalCode: "20100", country: "Italia" },
    ),
    billingAddress: "{}",
    subtotalCents: isFr ? 120000 : 122000,
    shippingCents: 8800,
    taxCents: isFr ? 21466 : 23344,
    totalCents: isFr ? 128800 : 130800,
    currency: "EUR",
    taxRateBp: isFr ? 2000 : 2200,
    unboxingFeeCents: 0,
    shippingFloor: 0,
    customerNotes: null,
    paidAt: new Date(),
    createdAt: new Date(),
    items: [
      {
        productName: isFr
          ? "Chaise Sölden en hêtre courbé avec assise rembourrée"
          : "Sedia Sölden in faggio curvato con seduta imbottita",
        variantName: null,
        sku: "SDSOLDTES-S",
        unitPriceCents: isFr ? 60000 : 61000,
        quantity: 1,
        totalCents: isFr ? 60000 : 61000,
        attributesSnapshot: isFr
          ? "STRUCTURE:Bois teinté|UPHOLSTERY:KVADRAT-GUEST-0210"
          : "STRUCTURE:Legno tinto|UPHOLSTERY:KVADRAT-GUEST-0210",
      },
      {
        productName: isFr
          ? "Table basse Peer A en hêtre courbé"
          : "Tavolino Peer A in faggio curvato",
        variantName: null,
        sku: "TVPEEALGN",
        unitPriceCents: isFr ? 60000 : 61000,
        quantity: 1,
        totalCents: isFr ? 60000 : 61000,
        attributesSnapshot: null,
      },
    ],
  };
}

async function main() {
  const destDir = path.resolve(process.cwd(), "..");
  for (const lang of ["it", "fr"] as const) {
    const buf = await buildOrderPdf(mock(lang));
    const out = path.join(destDir, `fattura-esempio-${lang}.pdf`);
    fs.writeFileSync(out, buf);
    console.log(`✓ ${out}  (${buf.length} bytes)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
