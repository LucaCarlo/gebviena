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
  street?: string; city?: string; province?: string; postalCode?: string; country?: string;
} {
  try { return JSON.parse(json); } catch { return {}; }
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

  // Corpo lettera come da testo cliente. {delivery} = data/tempo consegna.
  const paragraphs = isFr
    ? [
        "Cher client,",
        "nous vous remercions d'avoir choisi Gebrüder Thonet Vienna.",
        "Vous trouverez en pièce jointe le document PDF contenant le détail de votre commande.",
        `La livraison est prévue ${deliveryStr}.`,
        "Aucun code de suivi n'est disponible pour cette expédition ; toutefois, notre transporteur vous contactera au préalable au numéro indiqué lors de la saisie de l'adresse de livraison, afin de vous communiquer à l'avance la date effective de livraison.",
        "Pour toute nécessité ou information complémentaire, notre équipe reste à votre disposition à l'adresse info@gebruederthonetvienna.com ou au numéro +39 011 0133330.",
        "Cordialement,<br>Gebrüder Thonet Vienna",
      ]
    : [
        "Gentile Cliente,",
        "ti ringraziamo per aver scelto Gebrüder Thonet Vienna.",
        "In allegato trovi il documento PDF contenente il dettaglio del tuo ordine.",
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
 * Stringa consegna localizzata. Calcola data = (paidAt||createdAt) + N
 * settimane, dove N è il numero (ultimo) nel lead-time configurato. Se non
 * si riesce a parsare, ripiega sulla frase "entro {leadTime}".
 */
function deliveryString(order: OrderWithItems, leadTime: string): string {
  const isFr = order.language === "fr";
  const nums = (leadTime.match(/\d+/g) || []).map(Number);
  const weeks = nums.length ? nums[nums.length - 1] : 0;
  if (weeks > 0) {
    const base = order.paidAt || order.createdAt;
    const d = new Date(base.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    const months = isFr
      ? ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
      : ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
    const ds = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    return isFr ? `pour le ${ds}` : `per il giorno ${ds}`;
  }
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
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Registra i font TTF embedded (evita la dipendenza dagli .afm standard
      // che Next.js non bundla). FONT = regular, FONT_BOLD = grassetto.
      const FONT = "Body";
      const FONT_BOLD = "BodyBold";
      const regPath = firstExisting(FONT_REG_CANDIDATES);
      const boldPath = firstExisting(FONT_BOLD_CANDIDATES);
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
            unboxing: "Déballage et reprise emballages",
            shippingFree: "Offerte",
            docNote: "Document de confirmation de commande. Ne constitue pas un document fiscal.",
            paymentHeading: "Mode de paiement",
            paymentText: "Carte bancaire / Virement bancaire (via Stripe).",
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
            unboxing: "Disimballo e smaltimento imballi",
            shippingFree: "Gratuita",
            docNote: "Documento di conferma ordine. Non costituisce documento fiscale.",
            paymentHeading: "Modalità di pagamento",
            paymentText: "Carta di credito / Bonifico bancario (via Stripe).",
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
      if (order.shippingCents > 0) rowTotal(t.shipping, eur(order.shippingCents));
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
      if (y + 40 > 720) { doc.addPage(); y = 60; }
      doc.font(FB).fontSize(10).fillColor("#111").text(t.paymentHeading, 50, y); y += 14;
      doc.font(F).fontSize(9).fillColor("#333").text(t.paymentText, 50, y, { width: tableWidth });

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

  const isFr = order.language === "fr";
  const cfg = await getStoreGeneralConfig();
  const leadTime = isFr ? cfg.deliveryLeadTimeFr : cfg.deliveryLeadTime;
  const deliveryStr = deliveryString(order as OrderWithItems, leadTime);

  const html = buildHtml(order as OrderWithItems, deliveryStr);
  const pdf = await buildPdfBuffer(order as OrderWithItems);

  const subject = isFr
    ? `Confirmation de commande ${order.orderNumber} — ${COMPANY.name}`
    : `Conferma d'ordine ${order.orderNumber} — ${COMPANY.name}`;

  const ok = await sendMail(order.email, subject, html, {
    fromName: COMPANY.name,
    replyTo: COMPANY.email,
    bcc: COMPANY.email,
    attachments: [{
      filename: `${order.orderNumber}.pdf`,
      content: pdf,
      contentType: "application/pdf",
    }],
  });

  if (ok) {
    console.log("[order-email] sent for order", order.orderNumber, "to", order.email);
  } else {
    console.error("[order-email] FAILED for order", order.orderNumber, "to", order.email);
  }
  return ok;
}
