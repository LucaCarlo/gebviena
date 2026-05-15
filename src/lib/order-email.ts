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

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

const COMPANY = {
  name: "Gebrüder Thonet Vienna",
  legalName: "GTV Verlagsanstalt GmbH",
  addressLine1: "Wienerstrasse 53",
  addressLine2: "1230 Wien",
  country: "Austria",
  vat: "ATU60853336",
  email: "info@gebruederthonetvienna.com",
  website: "gebruederthonetvienna.com",
};

const LOGO_PATH = path.join(process.cwd(), "public", "logo-email-black.png");

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
  try {
    return fs.readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
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

/** Costruisce il body HTML dell'email cliente. */
function buildHtml(order: OrderWithItems): string {
  const ship = parseAddress(order.shippingAddress);
  const isFr = order.language === "fr";

  const t = isFr ? {
    title: "Confirmation de votre commande",
    greeting: `Bonjour ${order.firstName},`,
    intro: "Nous avons bien reçu votre commande, merci !",
    orderNo: "Numéro de commande",
    shipping: "Adresse de livraison",
    summary: "Récapitulatif",
    article: "Article",
    qty: "Qté",
    total: "Total",
    subtotal: "Sous-total",
    shippingFee: "Livraison",
    unboxingFee: "Déballage et reprise emballages",
    vat: "dont TVA",
    grandTotal: "Total",
    next: "Vous trouverez en pièce jointe le PDF récapitulatif. Nous vous contacterons pour confirmer le délai de livraison.",
    questions: "Pour toute question, répondez simplement à cet email.",
  } : {
    title: "Conferma del tuo ordine",
    greeting: `Ciao ${order.firstName},`,
    intro: "Abbiamo ricevuto il tuo ordine, grazie!",
    orderNo: "Numero ordine",
    shipping: "Indirizzo di spedizione",
    summary: "Riepilogo",
    article: "Articolo",
    qty: "Q.tà",
    total: "Totale",
    subtotal: "Subtotale",
    shippingFee: "Spedizione",
    unboxingFee: "Disimballo e smaltimento",
    vat: "di cui IVA",
    grandTotal: "Totale",
    next: "In allegato trovi il PDF di riepilogo. Ti contatteremo per confermare i tempi di consegna.",
    questions: "Per qualsiasi domanda puoi rispondere direttamente a questa email.",
  };

  const itemsRows = order.items.map((it) => {
    const attrs = parseAttrs(it.attributesSnapshot);
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;">
          <div style="color:#222;font-weight:500;">${escape(it.productName)}</div>
          ${attrs ? `<div style="color:#666;font-size:12px;margin-top:2px;">${escape(attrs)}</div>` : ""}
          <div style="color:#999;font-size:11px;margin-top:2px;font-family:monospace;">SKU ${escape(it.sku)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#555;">${it.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;color:#222;font-family:monospace;">${eur(it.totalCents)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.title}</title></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e2db;">
        <tr><td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e2db;">
          <div style="font-size:11px;color:#888;letter-spacing:0.2em;text-transform:uppercase;">${escape(COMPANY.name)}</div>
          <h1 style="font-size:24px;font-weight:300;color:#222;margin:8px 0 0 0;letter-spacing:-0.01em;">${t.title}</h1>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 8px 0;color:#333;">${t.greeting}</p>
          <p style="margin:0 0 16px 0;color:#666;">${t.intro}</p>

          <table cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:13px;">
            <tr>
              <td style="padding:4px 16px 4px 0;color:#888;">${t.orderNo}</td>
              <td style="padding:4px 0;color:#222;font-family:monospace;">${escape(order.orderNumber)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 16px 32px;">
          <div style="font-size:11px;color:#888;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">${t.summary}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ddd;font-size:13px;">
            <thead>
              <tr>
                <th align="left" style="padding:8px 12px;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">${t.article}</th>
                <th style="padding:8px 12px;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;width:50px;">${t.qty}</th>
                <th align="right" style="padding:8px 12px;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;width:90px;">${t.total}</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:13px;">
            <tr><td align="right" style="padding:4px 12px;color:#666;">${t.subtotal}</td><td align="right" style="padding:4px 0;color:#333;font-family:monospace;width:90px;">${eur(order.subtotalCents)}</td></tr>
            <tr><td align="right" style="padding:4px 12px;color:#666;">${t.shippingFee}</td><td align="right" style="padding:4px 0;color:#333;font-family:monospace;">${order.shippingCents === 0 ? (isFr ? "Offerte" : "Gratuita") : eur(order.shippingCents)}</td></tr>
            ${order.unboxingFeeCents > 0 ? `<tr><td align="right" style="padding:4px 12px;color:#666;">${t.unboxingFee}</td><td align="right" style="padding:4px 0;color:#333;font-family:monospace;">${eur(order.unboxingFeeCents)}</td></tr>` : ""}
            <tr><td align="right" style="padding:4px 12px;color:#999;font-size:11px;">${t.vat} (${(order.taxRateBp / 100).toFixed(0)}%)</td><td align="right" style="padding:4px 0;color:#999;font-family:monospace;font-size:11px;">${eur(order.taxCents)}</td></tr>
            <tr><td align="right" style="padding:12px 12px 4px 12px;color:#222;font-weight:600;border-top:1px solid #ddd;">${t.grandTotal}</td><td align="right" style="padding:12px 0 4px 0;color:#222;font-family:monospace;font-weight:600;border-top:1px solid #ddd;font-size:16px;">${eur(order.totalCents)}</td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px 32px;">
          <div style="font-size:11px;color:#888;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">${t.shipping}</div>
          <div style="font-size:13px;color:#333;line-height:1.6;">
            ${escape(order.firstName)} ${escape(order.lastName)}<br>
            ${escape(ship.street || "")}<br>
            ${escape(ship.postalCode || "")} ${escape(ship.city || "")}${ship.province ? " (" + escape(ship.province) + ")" : ""}<br>
            ${escape(ship.country || "")}
            ${order.phone ? `<br>${escape(order.phone)}` : ""}
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 32px 32px;">
          <p style="margin:0 0 12px 0;color:#666;font-size:13px;line-height:1.6;">${t.next}</p>
          <p style="margin:0;color:#666;font-size:13px;line-height:1.6;">${t.questions}</p>
        </td></tr>

        <tr><td style="padding:16px 32px;background:#faf8f3;border-top:1px solid #e5e2db;font-size:11px;color:#888;line-height:1.6;">
          <strong style="color:#555;">${escape(COMPANY.legalName)}</strong><br>
          ${escape(COMPANY.addressLine1)}, ${escape(COMPANY.addressLine2)} – ${escape(COMPANY.country)}<br>
          VAT ${escape(COMPANY.vat)} · <a href="https://${COMPANY.website}" style="color:#555;text-decoration:none;">${escape(COMPANY.website)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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
            title: "FACTURE / REÇU",
            seller: "Vendeur",
            client: "Client",
            invoiceNo: "Facture n.",
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
            fiscalHeading: "Mention fiscale",
            fiscalText: "Vente à distance intracommunautaire B2C soumise à la TVA française – régime OSS. Opération déclarée via le guichet unique OSS.",
            paymentHeading: "Mode de paiement",
            paymentText: "Carte bancaire / Virement bancaire (via Stripe).",
            country: "France",
            locale: "fr-FR",
          }
        : {
            title: "FATTURA / RICEVUTA",
            seller: "Venditore",
            client: "Cliente",
            invoiceNo: "Fattura n.",
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
            fiscalHeading: "Dicitura fiscale",
            fiscalText: "Vendita al consumatore finale (B2C) – IVA italiana applicata. Operazione non soggetta a fattura ai sensi dell'art. 22 DPR 633/72; il presente documento ha valore di ricevuta fiscale.",
            paymentHeading: "Modalità di pagamento",
            paymentText: "Carta di credito / Bonifico bancario (via Stripe).",
            country: "Italia",
            locale: "it-IT",
          };

      const vatRatePct = Math.round(order.taxRateBp / 100);
      const taxableBaseCents = order.subtotalCents + order.shippingCents + order.unboxingFeeCents - order.taxCents;

      // ─── HEADER: logo + titolo ───
      const logo = loadLogoBuffer();
      if (logo) {
        try { doc.image(logo, 50, 40, { height: 50 }); } catch { /* ignore */ }
      }
      doc.font(FB).fontSize(18).fillColor("#111").text(t.title, 0, 50, { align: "center" });

      let y = 110;

      // ─── VENDEUR ───
      doc.font(FB).fontSize(11).fillColor("#111").text(t.seller, 50, y);
      y += 16;
      doc.font(F).fontSize(10).fillColor("#333");
      doc.text(COMPANY.legalName, 50, y); y += 13;
      doc.text(COMPANY.addressLine1, 50, y); y += 13;
      doc.text(`${COMPANY.addressLine2} – ${COMPANY.country}`, 50, y); y += 13;
      doc.text(`VAT ${COMPANY.vat}`, 50, y); y += 13;

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

      // ─── MENTION FISCALE ───
      if (y + 60 > 770) { doc.addPage(); y = 60; }
      doc.font(FB).fontSize(10).fillColor("#111").text(t.fiscalHeading, 50, y); y += 14;
      doc.font(F).fontSize(9).fillColor("#333").text(t.fiscalText, 50, y, { width: tableWidth });
      y += doc.heightOfString(t.fiscalText, { width: tableWidth }) + 18;

      // ─── PAYMENT ───
      if (y + 40 > 770) { doc.addPage(); y = 60; }
      doc.font(FB).fontSize(10).fillColor("#111").text(t.paymentHeading, 50, y); y += 14;
      doc.font(F).fontSize(9).fillColor("#333").text(t.paymentText, 50, y, { width: tableWidth });

      // ─── FOOTER ───
      doc.font(F).fontSize(8).fillColor("#888").text(
        `${COMPANY.legalName} · ${COMPANY.addressLine1}, ${COMPANY.addressLine2} (${COMPANY.country}) · VAT ${COMPANY.vat} · ${COMPANY.website}`,
        50, 800, { width: tableWidth, align: "center" },
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

  const html = buildHtml(order as OrderWithItems);
  const pdf = await buildPdfBuffer(order as OrderWithItems);

  const isFr = order.language === "fr";
  const subject = isFr
    ? `Confirmation de commande ${order.orderNumber} — ${COMPANY.name}`
    : `Conferma ordine ${order.orderNumber} — ${COMPANY.name}`;

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
