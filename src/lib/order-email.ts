/**
 * Email transazionale post-pagamento + PDF di riepilogo.
 *
 * Esposta come `sendOrderConfirmationEmail(orderId)`. Chiamata dal webhook
 * Stripe quando arriva `payment_intent.succeeded`, e dal fallback in
 * `order-status` se il webhook non è configurato. Idempotenza basata sul
 * flag Order.confirmationEmailSentAt (se aggiunto in futuro) — al momento
 * affidata al caller (chiama solo quando lo status passa a PAID).
 */
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { getStoreGeneralConfig } from "@/lib/stripe-config";

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

const COMPANY = {
  name: "Gebrüder Thonet Vienna",
  legalName: "Production Furniture International S.p.A",
  addressLine1: "Via Vincenzo Vela 35/B",
  addressLine2: "10128 Torino",
  country: "Italy",
  vat: "08743760012",
  rea: "TO-997261",
  email: "info@gebruederthonetvienna.com",
  website: "gebruederthonetvienna.com",
};

/** Indirizzo showroom dove il cliente ritira l'ordine (ritiro al punto vendita). */
const PICKUP_ADDRESS = "Via Foggia 23H – 10125 Torino (Italy)";

/** Coordinate bancarie per pagamento via bonifico (mostrate nel PDF e nell'email cliente). */
const BANK_DETAILS = {
  beneficiary: "Production Furniture International S.p.A",
  beneficiaryAddress: "Via Vincenzo Vela 35/B, Torino — P.IVA 08743760012",
  bank: "Intesa SanPaolo S.p.A.",
  bankBranch: "Tolentino (MC) Italia — Piazzale Peramezza/2",
  iban: "IT60R0306969200100000002565",
  bic: "BCITITMMXXX",
};

// Logo GTV identico a quello dell'header del sito (logo.webp convertito in
// PNG perché pdfkit non legge webp). Fallback al logo email se assente.
const LOGO_CANDIDATES = [
  path.join(process.cwd(), "assets", "logo-invoice.png"),
  path.join(process.cwd(), "public", "logo-email-black.png"),
];

// pdfkit di default cerca i font standard (.afm) in node_modules, ma Next.js
// NON li include nel bundle .next → ENOENT su Helvetica.afm in produzione.
// Soluzione: embeddiamo DejaVuSans (TTF) nel repo e li registriamo
// esplicitamente. Fallback ai TTF di sistema Debian se il repo non li ha.
const FONT_REG_CANDIDATES = [
  path.join(process.cwd(), "assets", "fonts", "DejaVuSans.ttf"),
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];
const FONT_BOLD_CANDIDATES = [
  path.join(process.cwd(), "assets", "fonts", "DejaVuSans-Bold.ttf"),
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
  }
  return null;
}

function loadLogoBuffer(): Buffer | null {
  for (const p of LOGO_CANDIDATES) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p); } catch { /* ignore */ }
  }
  return null;
}

/** Numero progressivo "INV-NNNN/YYYY" derivato da orderNumber + anno paidAt/createdAt. */
function invoiceNumber(order: { orderNumber: string; paidAt: Date | null; createdAt: Date }): string {
  const year = (order.paidAt || order.createdAt).getFullYear();
  // Prendiamo la coda dell'orderNumber (es. "GTV-XXX-YYYY" → ultime 4 cifre/lettere)
  const tail = order.orderNumber.split("-").pop() || order.orderNumber;
  return `${tail}/${year}`;
}

export interface OrderWithItems {
  id: string;
  orderNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  language: string;
  customerTaxId?: string | null;
  shippingAddress: string;
  billingAddress: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  taxRateBp: number;
  unboxingFeeCents: number;
  shippingFloor: number | null;
  storePickup?: boolean;
  paymentProvider?: string | null;
  customerNotes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  items: Array<{
    productName: string;
    variantName: string | null;
    sku: string;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
    attributesSnapshot: string | null;
  }>;
}

function parseAddress(json: string): {
  street?: string; city?: string; province?: string; postalCode?: string; country?: string; company?: string;
} {
  try { return JSON.parse(json); } catch { return {}; }
}

function floorLabel(n: number | null | undefined, isFr: boolean): string {
  const it = ["Piano terra", "1° piano", "2° piano", "3° piano", "4° piano", "5° piano o oltre"];
  const fr = ["Rez-de-chaussée", "1er étage", "2e étage", "3e étage", "4e étage", "5e étage ou plus"];
  const i = Math.max(0, Math.min(5, n ?? 0));
  return (isFr ? fr : it)[i];
}

function parseAttrs(s: string | null): string {
  if (!s) return "";
  // attributesSnapshot è "TYPE:label|TYPE:label" — restituisco in chiaro.
  return s.split("|").map((p) => p.split(":").slice(1).join(":")).filter(Boolean).join(" · ");
}

/** Costruisce il body HTML dell'email cliente (lettera "Conferma d'ordine"). */
function buildHtml(order: OrderWithItems, deliveryStr: string): string {
  const isFr = order.language === "fr";
  const title = isFr ? "Confirmation de commande" : "Conferma d'ordine";

  const isBonificoOrder = order.paymentProvider === "bonifico";

  // Corpo lettera come da testo cliente. {delivery} = data/tempo consegna.
  const paragraphs = isFr
    ? [
        "Cher client,",
        "nous vous remercions d'avoir choisi Gebrüder Thonet Vienna.",
        "Vous trouverez en pièce jointe le document PDF contenant le détail de votre commande.",
        ...(isBonificoOrder
          ? ["Pour finaliser votre commande, veuillez effectuer le virement bancaire en utilisant les coordonnées indiquées ci-dessous. La livraison ne sera lancée qu'après confirmation de la bonne réception des fonds."]
          : []),
        `La livraison est prévue ${deliveryStr}.`,
        "Aucun code de suivi n'est disponible pour cette expédition ; toutefois, notre transporteur vous contactera au préalable au numéro indiqué lors de la saisie de l'adresse de livraison, afin de vous communiquer à l'avance la date effective de livraison.",
        "Pour toute nécessité ou information complémentaire, notre équipe reste à votre disposition à l'adresse info@gebruederthonetvienna.com ou au numéro +39 011 0133330.",
        "Cordialement,<br>Gebrüder Thonet Vienna",
      ]
    : [
        "Gentile Cliente,",
        "ti ringraziamo per aver scelto Gebrüder Thonet Vienna.",
        "In allegato trovi il documento PDF contenente il dettaglio del tuo ordine.",
        ...(isBonificoOrder
          ? ["Per completare il tuo ordine, ti chiediamo di effettuare il bonifico utilizzando le coordinate indicate qui sotto. La consegna sarà avviata solo dopo la conferma dell'avvenuto accredito."]
          : []),
        `La consegna è prevista ${deliveryStr}.`,
        "Per questa spedizione non è disponibile un codice di tracciamento; tuttavia, il nostro corriere incaricato ti contatterà preventivamente al numero indicato in fase di compilazione dell'indirizzo di spedizione, comunicandoti con anticipo la data effettiva di consegna.",
        "Per qualsiasi necessità o ulteriore informazione, il nostro team rimane a tua disposizione all'indirizzo info@gebruederthonetvienna.com oppure al numero +39 011 0133330.",
        "Cordiali saluti,<br>Gebrüder Thonet Vienna",
      ];

  const bodyHtml = paragraphs
    .map((p) => `<p style="margin:0 0 16px 0;color:#333;font-size:14px;line-height:1.7;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e2db;">
        <tr><td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e2db;">
          <div style="font-size:11px;color:#888;letter-spacing:0.2em;text-transform:uppercase;">${escape(COMPANY.name)}</div>
          <h1 style="font-size:22px;font-weight:300;color:#222;margin:8px 0 0 0;letter-spacing:-0.01em;">${title} ${escape(order.orderNumber)}</h1>
        </td></tr>

        <tr><td style="padding:28px 32px 8px 32px;">
          ${bodyHtml}
        </td></tr>

        <tr><td style="padding:0 32px 20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e2db;border-radius:4px;">
            ${order.storePickup ? `<tr><td style="padding:12px 16px;font-size:13px;color:#333;${order.customerNotes && order.customerNotes.trim() ? "border-bottom:1px solid #f0ede6;" : ""}">
              <strong style="color:#555;">${isFr ? "Livraison" : "Spedizione"}:</strong>
              ${isFr ? "Retrait en magasin" : "Ritiro al punto di vendita"}<br>
              <span style="color:#666;">${escape(PICKUP_ADDRESS)}</span>
            </td></tr>` : `<tr><td style="padding:12px 16px;border-bottom:1px solid #f0ede6;font-size:13px;color:#333;">
              <strong style="color:#555;">${isFr ? "Livraison standard" : "Spedizione standard"}:</strong>
              ${order.shippingCents > 0
                ? escape(new Intl.NumberFormat(isFr ? "fr-FR" : "it-IT", { style: "currency", currency: order.currency }).format(order.shippingCents / 100))
                : (isFr ? "Offerte" : "Gratuita")}
            </td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#333;${order.customerNotes && order.customerNotes.trim() ? "border-bottom:1px solid #f0ede6;" : ""}">
              <strong style="color:#555;">${isFr ? "Étage de livraison" : "Piano di consegna"}:</strong>
              ${escape(floorLabel(order.shippingFloor, isFr))}
            </td></tr>`}
            ${order.customerNotes && order.customerNotes.trim() ? `<tr><td style="padding:12px 16px;font-size:13px;color:#333;">
              <strong style="color:#555;">${isFr ? "Remarques" : "Note"}:</strong>
              ${escape(order.customerNotes.trim())}
            </td></tr>` : ""}
          </table>
        </td></tr>

        ${order.paymentProvider === "bonifico" ? `<tr><td style="padding:0 32px 20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #c9c4b8;border-radius:4px;background:#fffdf6;">
            <tr><td style="padding:14px 16px 6px 16px;border-bottom:1px solid #efeae0;">
              <strong style="font-size:13px;color:#5a4f30;text-transform:uppercase;letter-spacing:0.08em;">${isFr ? "Paiement par virement bancaire" : "Pagamento tramite bonifico bancario"}</strong>
            </td></tr>
            <tr><td style="padding:14px 16px 8px 16px;font-size:13px;color:#333;line-height:1.6;">
              <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">${isFr ? "Bénéficiaire" : "Beneficiario"}</div>
              <div><strong>${escape(BANK_DETAILS.beneficiary)}</strong></div>
              <div style="color:#666;font-size:12px;">${escape(BANK_DETAILS.beneficiaryAddress)}</div>
            </td></tr>
            <tr><td style="padding:6px 16px;font-size:13px;color:#333;line-height:1.6;">
              <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">${isFr ? "Banque" : "Banca"}</div>
              <div><strong>${escape(BANK_DETAILS.bank)}</strong></div>
              <div style="color:#666;font-size:12px;">${escape(BANK_DETAILS.bankBranch)}</div>
            </td></tr>
            <tr><td style="padding:6px 16px;font-size:13px;color:#333;">
              <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">IBAN</div>
              <div style="font-family:Menlo,Consolas,monospace;font-weight:600;color:#111;font-size:14px;word-break:break-all;">${escape(BANK_DETAILS.iban)}</div>
            </td></tr>
            <tr><td style="padding:6px 16px;font-size:13px;color:#333;">
              <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">BIC / SWIFT</div>
              <div style="font-family:Menlo,Consolas,monospace;color:#111;">${escape(BANK_DETAILS.bic)}</div>
            </td></tr>
            <tr><td style="padding:6px 16px 12px 16px;font-size:13px;color:#333;">
              <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">${isFr ? "Motif (à indiquer obligatoirement)" : "Causale (obbligatoria)"}</div>
              <div style="font-family:Menlo,Consolas,monospace;font-weight:600;color:#111;">Ordine ${escape(order.orderNumber)}</div>
            </td></tr>
            <tr><td style="padding:12px 16px 14px 16px;border-top:1px solid #efeae0;font-size:12px;color:#5a4f30;line-height:1.6;">
              ${isFr
                ? "Pour tout paiement par virement bancaire, le traitement de la commande interviendra après confirmation de la bonne réception des fonds."
                : "In caso di pagamento tramite bonifico bancario, ci riserviamo di attendere la conferma dell&apos;avvenuto accredito prima di procedere con l&apos;elaborazione dell&apos;ordine."}
            </td></tr>
          </table>
        </td></tr>` : ""}

        ${(() => {
          // Mostra l'indirizzo di fatturazione SOLO se diverso dallo shipping (cliente B2B o regalo).
          try {
            const ship = JSON.parse(order.shippingAddress);
            const bill = JSON.parse(order.billingAddress);
            const same = JSON.stringify({ s: ship.street, c: ship.city, p: ship.province, z: ship.postalCode, k: ship.country }) ===
                         JSON.stringify({ s: bill.street, c: bill.city, p: bill.province, z: bill.postalCode, k: bill.country });
            if (same) return "";
            const lines: string[] = [];
            if (bill.company) lines.push(escape(bill.company));
            if (bill.street) lines.push(escape(bill.street));
            const ll = [bill.postalCode, bill.city].filter(Boolean).join(" ") + (bill.province ? ` (${escape(String(bill.province).toUpperCase())})` : "");
            if (ll.trim()) lines.push(escape(ll));
            if (bill.country) lines.push(escape(String(bill.country)));
            return `<tr><td style="padding:0 32px 20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e2db;border-radius:4px;">
                <tr><td style="padding:12px 16px;font-size:13px;color:#333;">
                  <strong style="color:#555;">${isFr ? "Adresse de facturation" : "Indirizzo di fatturazione"}:</strong><br>
                  ${lines.join("<br>")}
                </td></tr>
              </table>
            </td></tr>`;
          } catch { return ""; }
        })()}

        <tr><td style="padding:16px 32px;background:#faf8f3;border-top:1px solid #e5e2db;font-size:11px;color:#888;line-height:1.6;">
          <strong style="color:#555;">${escape(COMPANY.legalName)}</strong><br>
          ${escape(COMPANY.addressLine1)}, ${escape(COMPANY.addressLine2)} – ${escape(COMPANY.country)}<br>
          P.IVA ${escape(COMPANY.vat)} · REA ${escape(COMPANY.rea)} · <a href="https://${COMPANY.website}" style="color:#555;text-decoration:none;">${escape(COMPANY.website)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Stringa consegna localizzata: SEMPRE la frase con il lead-time
 * configurato (es. "entro 6 settimane" / "sous 6 semaines"), NON una
 * data calcolata.
 */
function deliveryString(order: OrderWithItems, leadTime: string): string {
  const isFr = order.language === "fr";
  return isFr ? `sous ${leadTime}` : `entro ${leadTime}`;
}

function escape(s: string): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

/** Genera il PDF fattura/ricevuta come Buffer, layout stile fattura europea. */
export async function buildOrderPdf(order: OrderWithItems): Promise<Buffer> {
  return buildPdfBuffer(order);
}

async function buildPdfBuffer(order: OrderWithItems): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      // I font TTF embedded vanno risolti PRIMA di costruire il documento:
      // il costruttore di PDFDocument chiama initFonts() che, senza opzione
      // `font`, carica di default Helvetica → legge data/Helvetica.afm, che
      // il bundle webpack di Next NON include (ENOENT in produzione). Passando
      // il TTF come `font` nelle opzioni, pdfkit non tocca mai gli .afm.
      const FONT = "Body";
      const FONT_BOLD = "BodyBold";
      const regPath = firstExisting(FONT_REG_CANDIDATES);
      const boldPath = firstExisting(FONT_BOLD_CANDIDATES);

      const docOpts: PDFKit.PDFDocumentOptions = { size: "A4", margin: 50 };
      if (regPath) docOpts.font = regPath;
      const doc = new PDFDocument(docOpts);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (regPath) doc.registerFont(FONT, regPath);
      if (boldPath) doc.registerFont(FONT_BOLD, boldPath);
      // Se per qualche motivo i TTF non ci sono, ripieghiamo sui built-in
      // (meglio un PDF brutto che nessun PDF / crash dell'email).
      const F = regPath ? FONT : "Helvetica";
      const FB = boldPath ? FONT_BOLD : "Helvetica-Bold";

      const isFr = order.language === "fr";
      const t = isFr
        ? {
            title: "CONFIRMATION DE COMMANDE",
            seller: "Vendeur",
            client: "Client",
            invoiceNo: "Commande n°",
            date: "Date",
            description: "Description",
            quantity: "Quantité",
            unitPrice: "Prix unitaire",
            total: "Total",
            taxBase: "Base imposable",
            vatLabel: (rate: number) => `TVA France ${rate}%`,
            grandTotal: "Total TTC",
            shipping: "Livraison",
            shippingFreeRow: "Livraison standard : offerte",
            storePickupRow: "Retrait en magasin",
            storePickupAddr: `Retrait au showroom : ${PICKUP_ADDRESS}`,
            shipFloor: "Étage de livraison",
            notes: "Remarques du client",
            unboxing: "Déballage et reprise emballages",
            shippingFree: "Offerte",
            docNote: "Document de confirmation de commande. Ne constitue pas un document fiscal.",
            paymentHeading: "Mode de paiement",
            paymentText: "Carte bancaire / Klarna (via Stripe).",
            bonificoHeading: "Paiement par virement bancaire",
            bonificoNotice: "Pour tout paiement par virement bancaire, le traitement de la commande interviendra après confirmation de la bonne réception des fonds.",
            bonificoLabels: {
              beneficiary: "Bénéficiaire",
              bank: "Banque",
              iban: "IBAN",
              bic: "BIC / SWIFT",
              reason: "Motif (à indiquer obligatoirement)",
            },
            country: "France",
            locale: "fr-FR",
          }
        : {
            title: "CONFERMA D'ORDINE",
            seller: "Venditore",
            client: "Cliente",
            invoiceNo: "Ordine n°",
            date: "Data",
            description: "Descrizione",
            quantity: "Quantità",
            unitPrice: "Prezzo unitario",
            total: "Totale",
            taxBase: "Imponibile",
            vatLabel: (rate: number) => `IVA Italia ${rate}%`,
            grandTotal: "Totale IVA inclusa",
            shipping: "Spedizione",
            shippingFreeRow: "Spedizione standard: gratuita",
            storePickupRow: "Ritiro al punto di vendita",
            storePickupAddr: `Ritiro presso lo showroom: ${PICKUP_ADDRESS}`,
            shipFloor: "Piano di consegna",
            notes: "Note del cliente",
            unboxing: "Disimballo e smaltimento imballi",
            shippingFree: "Gratuita",
            docNote: "Documento di conferma ordine. Non costituisce documento fiscale.",
            paymentHeading: "Modalità di pagamento",
            paymentText: "Carta di credito / Klarna (via Stripe).",
            bonificoHeading: "Pagamento tramite bonifico bancario",
            bonificoNotice: "In caso di pagamento tramite bonifico bancario, ci riserviamo di attendere la conferma dell'avvenuto accredito prima di procedere con l'elaborazione dell'ordine.",
            bonificoLabels: {
              beneficiary: "Beneficiario",
              bank: "Banca",
              iban: "IBAN",
              bic: "BIC / SWIFT",
              reason: "Causale (obbligatoria)",
            },
            country: "Italia",
            locale: "it-IT",
          };

      const vatRatePct = Math.round(order.taxRateBp / 100);
      const taxableBaseCents = order.subtotalCents + order.shippingCents + order.unboxingFeeCents - order.taxCents;

      // ─── HEADER: logo GTV centrato + titolo sotto ───
      const pageW = doc.page.width;
      const logo = loadLogoBuffer();
      if (logo) {
        const logoH = 46;
        const logoW = logoH * (418 / 343); // ratio del logo.webp
        try { doc.image(logo, (pageW - logoW) / 2, 38, { height: logoH }); } catch { /* ignore */ }
      }
      doc.font(FB).fontSize(18).fillColor("#111").text(t.title, 0, 96, { align: "center" });

      let y = 132;

      // ─── VENDEUR ───
      doc.font(FB).fontSize(11).fillColor("#111").text(t.seller, 50, y);
      y += 16;
      doc.font(F).fontSize(10).fillColor("#333");
      doc.text(COMPANY.legalName, 50, y); y += 13;
      doc.text(COMPANY.addressLine1, 50, y); y += 13;
      doc.text(`${COMPANY.addressLine2} – ${COMPANY.country}`, 50, y); y += 13;
      doc.text(`P.IVA ${COMPANY.vat} – REA ${COMPANY.rea}`, 50, y); y += 13;

      y += 14;

      // ─── CLIENT ───
      doc.font(FB).fontSize(11).fillColor("#111").text(t.client, 50, y);
      y += 16;
      doc.font(F).fontSize(10).fillColor("#333");
      const ship = parseAddress(order.shippingAddress);
      doc.text(`${order.firstName} ${order.lastName}`, 50, y); y += 13;
      if (ship.street) { doc.text(ship.street, 50, y); y += 13; }
      const cityLine = `${ship.postalCode || ""} ${ship.city || ""}${ship.province ? ` (${ship.province})` : ""} – ${ship.country || t.country}`.trim();
      doc.text(cityLine, 50, y); y += 13;
      if (order.phone) { doc.text(order.phone, 50, y); y += 13; }
      doc.text(order.email, 50, y); y += 13;
      if (order.customerTaxId) {
        doc.text(`${isFr ? "N° TVA / Code fiscal" : "P.IVA / C.F."}: ${order.customerTaxId}`, 50, y);
        y += 13;
      }
      if (order.storePickup) {
        doc.font(FB).fillColor("#111").text(`${t.shipping}: `, 50, y, { continued: true });
        doc.font(F).fillColor("#333").text(t.storePickupRow);
        y += 13;
        doc.font(F).fillColor("#555").fontSize(9).text(t.storePickupAddr, 50, y);
        doc.fontSize(10);
        y += 13;
      } else {
        doc.font(FB).fillColor("#111").text(`${t.shipFloor}: `, 50, y, { continued: true });
        doc.font(F).fillColor("#333").text(floorLabel(order.shippingFloor, isFr));
        y += 13;
      }
      if (order.customerNotes && order.customerNotes.trim()) {
        const note = order.customerNotes.trim();
        doc.font(FB).fontSize(10).fillColor("#111").text(`${t.notes}:`, 50, y);
        y += 13;
        doc.font(F).fontSize(10).fillColor("#333").text(note, 50, y, { width: 500 });
        y += doc.heightOfString(note, { width: 500 }) + 2;
      }

      // ─── Indirizzo di fatturazione separato (solo se diverso da quello di spedizione) ───
      try {
        const bill = parseAddress(order.billingAddress);
        const same =
          (ship.street || "") === (bill.street || "") &&
          (ship.city || "") === (bill.city || "") &&
          (ship.postalCode || "") === (bill.postalCode || "") &&
          (ship.country || "") === (bill.country || "");
        if (!same) {
          y += 8;
          doc.font(FB).fontSize(10).fillColor("#111").text(isFr ? "Adresse de facturation:" : "Indirizzo di fatturazione:", 50, y);
          y += 13;
          if (bill.company) { doc.font(F).fontSize(10).fillColor("#333").text(String(bill.company), 50, y); y += 13; }
          if (bill.street)  { doc.font(F).fontSize(10).fillColor("#333").text(String(bill.street), 50, y); y += 13; }
          const billCity = `${bill.postalCode || ""} ${bill.city || ""}${bill.province ? ` (${String(bill.province).toUpperCase()})` : ""} – ${bill.country || ""}`.trim();
          doc.font(F).fontSize(10).fillColor("#333").text(billCity, 50, y); y += 13;
        }
      } catch { /* ignore */ }

      y += 14;

      // ─── DATI FATTURA ───
      const invoiceDate = (order.paidAt || order.createdAt).toLocaleDateString(t.locale, {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      doc.font(FB).fontSize(11).fillColor("#111")
        .text(`${t.invoiceNo} ${invoiceNumber(order)}`, 50, y);
      y += 16;
      doc.font(F).fontSize(10).fillColor("#333")
        .text(`${t.date} : ${invoiceDate}`, 50, y);
      y += 28;

      // ─── TABELLA ARTICOLI ───
      const col = { name: 50, qty: 240, unit: 320, total: 440 };
      const tableWidth = 500;
      const tableRight = 50 + tableWidth;

      // Header row
      doc.lineWidth(0.8).strokeColor("#111");
      doc.rect(50, y, tableWidth, 22).stroke();
      doc.font(FB).fontSize(10).fillColor("#111");
      doc.text(t.description, col.name + 6, y + 6, { width: 180 });
      doc.text(t.quantity, col.qty, y + 6, { width: 70 });
      doc.text(t.unitPrice, col.unit, y + 6, { width: 110 });
      doc.text(t.total, col.total, y + 6, { width: 100 });
      y += 22;

      // Item rows
      doc.font(F).fontSize(10).fillColor("#333");
      for (const it of order.items) {
        const attrs = parseAttrs(it.attributesSnapshot);
        const nameLines = doc.heightOfString(it.productName, { width: 180 });
        const attrLines = attrs ? doc.heightOfString(attrs, { width: 180 }) : 0;
        const rowH = Math.max(28, nameLines + attrLines + 10);
        if (y + rowH > 740) { doc.addPage(); y = 60; }
        doc.rect(50, y, tableWidth, rowH).stroke();
        doc.fillColor("#222").text(it.productName, col.name + 6, y + 6, { width: 180 });
        if (attrs) {
          doc.fontSize(8).fillColor("#666").text(attrs, col.name + 6, y + 6 + nameLines, { width: 180 });
          doc.fontSize(10).fillColor("#222");
        }
        doc.text(String(it.quantity), col.qty, y + 8, { width: 70 });
        doc.text(eur(it.unitPriceCents), col.unit, y + 8, { width: 110 });
        doc.text(eur(it.totalCents), col.total, y + 8, { width: 100 });
        y += rowH;
      }

      y += 14;

      // ─── TOTALI (tabella più piccola allineata a destra) ───
      const totalsX = 280;
      const totalsW = tableRight - totalsX;
      const rowTotal = (label: string, value: string, bold = false) => {
        doc.rect(totalsX, y, totalsW, 22).stroke();
        // separatore tra label e valore
        doc.moveTo(totalsX + totalsW / 2, y).lineTo(totalsX + totalsW / 2, y + 22).stroke();
        doc.font(bold ? FB : F).fontSize(10).fillColor("#111");
        doc.text(label, totalsX + 6, y + 6, { width: totalsW / 2 - 12 });
        doc.text(value, totalsX + totalsW / 2 + 6, y + 6, { width: totalsW / 2 - 12 });
        y += 22;
      };
      rowTotal(t.taxBase, eur(taxableBaseCents));
      if (order.storePickup) rowTotal(t.shipping, t.storePickupRow);
      else if (order.shippingCents > 0) rowTotal(t.shipping, eur(order.shippingCents));
      else rowTotal(t.shipping, t.shippingFree);
      if (order.unboxingFeeCents > 0) rowTotal(t.unboxing, eur(order.unboxingFeeCents));
      rowTotal(t.vatLabel(vatRatePct), eur(order.taxCents));
      rowTotal(t.grandTotal, eur(order.totalCents), true);

      y += 24;

      // ─── NOTA ─── (questo documento NON è una fattura fiscale)
      if (y + 50 > 720) { doc.addPage(); y = 60; }
      doc.font(F).fontSize(9).fillColor("#666").text(t.docNote, 50, y, { width: tableWidth });
      y += doc.heightOfString(t.docNote, { width: tableWidth }) + 18;

      // ─── PAYMENT ───
      const isBonifico = order.paymentProvider === "bonifico";
      if (isBonifico) {
        // Sezione coordinate bancarie completa + avviso "attendiamo accredito".
        if (y + 140 > 720) { doc.addPage(); y = 60; }
        doc.font(FB).fontSize(10).fillColor("#111").text(t.bonificoHeading, 50, y); y += 16;
        const bdRow = (label: string, value: string, mono = false) => {
          doc.font(F).fontSize(9).fillColor("#666").text(label, 50, y, { width: 160 });
          doc.font(mono ? FB : F).fontSize(9).fillColor("#111").text(value, 220, y, { width: tableWidth - 170 });
          y += 13;
        };
        bdRow(t.bonificoLabels.beneficiary, BANK_DETAILS.beneficiary);
        doc.font(F).fontSize(8.5).fillColor("#666").text(BANK_DETAILS.beneficiaryAddress, 220, y, { width: tableWidth - 170 });
        y += 13;
        bdRow(t.bonificoLabels.bank, BANK_DETAILS.bank);
        doc.font(F).fontSize(8.5).fillColor("#666").text(BANK_DETAILS.bankBranch, 220, y, { width: tableWidth - 170 });
        y += 13;
        bdRow(t.bonificoLabels.iban, BANK_DETAILS.iban, true);
        bdRow(t.bonificoLabels.bic, BANK_DETAILS.bic, true);
        bdRow(t.bonificoLabels.reason, `Ordine ${order.orderNumber}`, true);
        y += 8;
        doc.font(F).fontSize(9).fillColor("#333").text(t.bonificoNotice, 50, y, { width: tableWidth });
        y += doc.heightOfString(t.bonificoNotice, { width: tableWidth }) + 6;
      } else {
        if (y + 40 > 720) { doc.addPage(); y = 60; }
        doc.font(FB).fontSize(10).fillColor("#111").text(t.paymentHeading, 50, y); y += 14;
        doc.font(F).fontSize(9).fillColor("#333").text(t.paymentText, 50, y, { width: tableWidth });
      }

      // ─── FOOTER (ancorato in fondo alla pagina, SENZA creare pagina nuova) ───
      // A4=841.89pt, margine inferiore 50 → pdfkit auto-pagina se il testo
      // scende sotto height-bottomMargin (≈791.89). Il testo footer è ~10pt
      // alto: lo ancoriamo a height-bottom-26 così termina ben dentro.
      const footerY = doc.page.height - doc.page.margins.bottom - 26; // ≈765.89
      doc.moveTo(50, footerY - 9).lineTo(50 + tableWidth, footerY - 9).strokeColor("#ddd").lineWidth(0.5).stroke();
      doc.font(F).fontSize(8).fillColor("#888").text(
        `${COMPANY.legalName} · ${COMPANY.addressLine1}, ${COMPANY.addressLine2} (${COMPANY.country}) · P.IVA ${COMPANY.vat} · REA ${COMPANY.rea} · ${COMPANY.website}`,
        50, footerY, { width: tableWidth, align: "center", lineBreak: false },
      );

      doc.end();
    } catch (e) { reject(e); }
  });
}

/**
 * Invia conferma ordine al cliente (+ BCC a info@). Idempotente lato caller.
 * Ritorna `true` se Brevo/SMTP risponde ok.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    console.error("[order-email] order not found:", orderId);
    return false;
  }
  // Idempotenza: se già inviata, non re-inviare (sia webhook che fallback
  // success-page chiamano questa funzione).
  if ((order as { confirmationEmailSentAt?: Date | null }).confirmationEmailSentAt) {
    console.log("[order-email] già inviata per", order.orderNumber, "— skip");
    return true;
  }

  const isFr = order.language === "fr";
  const cfg = await getStoreGeneralConfig();
  const leadTime = isFr ? cfg.deliveryLeadTimeFr : cfg.deliveryLeadTime;
  const deliveryStr = deliveryString(order as OrderWithItems, leadTime);

  const html = buildHtml(order as OrderWithItems, deliveryStr);
  const pdf = await buildPdfBuffer(order as OrderWithItems);

  const subject = isFr
    ? `Confirmation de commande ${order.orderNumber} — ${COMPANY.name}`
    : `Conferma d'ordine ${order.orderNumber} — ${COMPANY.name}`;

  const pdfAttachment = {
    filename: `${order.orderNumber}.pdf`,
    content: pdf,
    contentType: "application/pdf",
  };

  const ok = await sendMail(order.email, subject, html, {
    fromName: COMPANY.name,
    replyTo: COMPANY.email,
    bcc: COMPANY.email,
    attachments: [pdfAttachment],
  });

  if (ok) {
    console.log("[order-email] sent for order", order.orderNumber, "to", order.email);
    // Marca come inviata SOLO se l'email cliente è partita (così un fallimento
    // transitorio può essere ritentato dal fallback success-page).
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationEmailSentAt: new Date() },
    }).catch((e) => console.error("[order-email] flag update error:", e));
  } else {
    console.error("[order-email] FAILED for order", order.orderNumber, "to", order.email);
  }

  // ─── Notifica interna agli admin spedizioni (venditaspeciale@) ───
  // Stesso PDF, ma messaggio operativo: ordine da evadere/spedire.
  const ship = parseAddress(order.shippingAddress);
  const itemsList = order.items
    .map((it) => `<li style="margin-bottom:4px;">${escape(it.productName)} — ${escape(it.sku)} × ${it.quantity} — ${eur(it.totalCents)}</li>`)
    .join("");
  const adminHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd;max-width:600px;">
    <tr><td style="padding:24px 28px;border-bottom:2px solid #111;">
      <div style="font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:#888;">${escape(COMPANY.name)} — Vendita Speciale</div>
      <h1 style="margin:8px 0 0;font-size:20px;color:#111;">Nuovo ordine da evadere · ${escape(order.orderNumber)}</h1>
    </td></tr>
    <tr><td style="padding:22px 28px;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 14px;"><strong>Procedere con la preparazione e la spedizione dell'ordine.</strong> In allegato il PDF con tutti i dettagli.</p>
      ${order.paymentProvider === "bonifico"
        ? `<p style="margin:0 0 14px;padding:10px 12px;background:#fffbe6;border-left:3px solid #d4a017;color:#5a4f30;"><strong>PAGAMENTO TRAMITE BONIFICO</strong> — l'ordine è stato registrato ma <u>NON è ancora pagato</u>. Attendere la conferma di accredito (IBAN <code>${BANK_DETAILS.iban}</code>) prima di evadere la spedizione. Lo stato Stripe è "PENDING" e va aggiornato manualmente da admin a "PAID" dopo la verifica banca.</p>`
        : ""}
      <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${escape(order.firstName)} ${escape(order.lastName)} — ${escape(order.email)}${order.phone ? " — ☎ " + escape(order.phone) : ""}</p>
      ${order.customerTaxId ? `<p style="margin:0 0 4px;"><strong>P.IVA/C.F.:</strong> ${escape(order.customerTaxId)}</p>` : ""}
      ${order.storePickup
        ? `<p style="margin:8px 0 4px;padding:8px 10px;background:#e7f5ee;border-left:3px solid #1e9e63;"><strong>RITIRO AL PUNTO DI VENDITA</strong> — nessuna spedizione. Il cliente ritira presso lo showroom: ${escape(PICKUP_ADDRESS)}</p>`
        : `<p style="margin:0 0 4px;"><strong>Spedire a:</strong> ${escape(order.firstName)} ${escape(order.lastName)}, ${escape(ship.street || "")}, ${escape(ship.postalCode || "")} ${escape(ship.city || "")}${ship.province ? " (" + escape(ship.province) + ")" : ""} — ${escape(ship.country || "")}</p>
      <p style="margin:0 0 4px;"><strong>Piano di consegna:</strong> ${escape(floorLabel(order.shippingFloor, false))}</p>
      <p style="margin:0 0 4px;"><strong>Spedizione standard:</strong> ${order.shippingCents > 0 ? escape(eur(order.shippingCents)) : "Gratuita"}</p>`}
      ${(() => {
        try {
          const bill = parseAddress(order.billingAddress);
          const same =
            (ship.street || "") === (bill.street || "") &&
            (ship.city || "") === (bill.city || "") &&
            (ship.postalCode || "") === (bill.postalCode || "") &&
            (ship.country || "") === (bill.country || "");
          if (same) return "";
          const company = bill.company ? `${escape(String(bill.company))}, ` : "";
          return `<p style="margin:6px 0 4px;padding:8px 10px;background:#eef5ff;border-left:3px solid #2563eb;"><strong>Indirizzo fatturazione (diverso):</strong> ${company}${escape(bill.street || "")}, ${escape(bill.postalCode || "")} ${escape(bill.city || "")}${bill.province ? " (" + escape(String(bill.province).toUpperCase()) + ")" : ""} — ${escape(bill.country || "")}</p>`;
        } catch { return ""; }
      })()}
      ${order.customerNotes && order.customerNotes.trim() ? `<p style="margin:8px 0 4px;padding:8px 10px;background:#fff8e1;border-left:3px solid #e0a800;"><strong>Note del cliente:</strong> ${escape(order.customerNotes.trim())}</p>` : ""}
      <p style="margin:14px 0 6px;"><strong>Articoli:</strong></p>
      <ul style="margin:0 0 14px;padding-left:20px;">${itemsList}</ul>
      <p style="margin:0;font-size:15px;"><strong>Totale ordine: ${eur(order.totalCents)}</strong></p>
      <p style="margin:14px 0 0;color:#666;font-size:13px;">
        Spedizione: nessun tracking. Contattare il cliente al numero indicato per concordare la consegna
        (consegna prevista ${escape(deliveryStr)}).
      </p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#faf8f3;border-top:1px solid #e5e2db;font-size:11px;color:#888;">
      ${escape(COMPANY.legalName)} · ${escape(COMPANY.addressLine1)}, ${escape(COMPANY.addressLine2)} (${escape(COMPANY.country)})
    </td></tr>
  </table>
</body></html>`;

  await sendMail("venditaspeciale@gebruederthonetvienna.com",
    `[DA EVADERE] Ordine ${order.orderNumber} — ${order.firstName} ${order.lastName}`,
    adminHtml,
    {
      fromName: `${COMPANY.name} — Ordini`,
      replyTo: order.email,
      attachments: [pdfAttachment],
    },
  ).then((aok) => {
    console.log("[order-email] admin notify", order.orderNumber, aok ? "sent" : "FAILED");
  }).catch((e) => console.error("[order-email] admin notify error:", e));

  return ok;
}
