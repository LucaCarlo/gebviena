/**
 * Email Template Renderer
 * Converts structured block JSON into email-safe HTML with inline styles.
 */

export interface EmailBlock {
  type: string;
  [key: string]: unknown;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderRichText(content: string): string {
  // Allow basic HTML tags: b, i, a, br, ul, li, p
  // Escape everything else but preserve allowed tags
  return content
    .replace(/\n/g, "<br/>")
    .replace(/• /g, "&bull; ");
}

function fontStack(font: string): string {
  const serif = ["Georgia", "Times New Roman", "Playfair Display", "Libre Caslon Text", "Cormorant Garamond"];
  const fallback = serif.some((f) => font.includes(f)) ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif";
  return `'${font}', ${fallback}`;
}

function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case "banner": {
      const url = (block.imageUrl as string) || "";
      if (!url) return "";
      const img = `<img src="${url}" alt="${escapeHtml((block.alt as string) || "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;" />`;
      return (block.linkUrl as string)
        ? `<tr><td><a href="${escapeHtml(block.linkUrl as string)}" target="_blank">${img}</a></td></tr>`
        : `<tr><td>${img}</td></tr>`;
    }

    case "title": {
      const font = fontStack((block.fontFamily as string) || "Georgia");
      const size = (block.fontSize as string) || "24";
      return `<tr><td style="padding:24px 32px 8px;text-align:${block.align || "center"};font-size:${size}px;font-weight:normal;color:${block.color || "#1a1a1a"};font-family:${font};">${escapeHtml((block.text as string) || "")}</td></tr>`;
    }

    case "text": {
      const font = fontStack((block.fontFamily as string) || "Arial");
      const textColor = (block.textColor as string) || "#444444";
      const bgColor = (block.bgColor as string) || "#ffffff";
      const content = renderRichText((block.content as string) || "");
      const bgStyle = bgColor !== "#ffffff" ? `background-color:${bgColor};` : "";
      return `<tr><td style="padding:8px 32px;text-align:${block.align || "left"};font-family:${font};font-size:15px;line-height:1.6;color:${textColor};${bgStyle}">${content}</td></tr>`;
    }

    case "button": {
      const radius = (block.borderRadius as string) || "6";
      return `<tr><td style="padding:16px 32px;text-align:${block.align || "center"};"><a href="${escapeHtml((block.url as string) || "#")}" target="_blank" style="display:inline-block;background-color:${block.color || "#3a5a6a"};color:#ffffff;text-decoration:none;padding:14px 36px;font-size:15px;font-family:Arial,sans-serif;font-weight:600;border-radius:${radius}px;">${escapeHtml((block.text as string) || "")}</a></td></tr>`;
    }

    case "divider":
      return `<tr><td style="padding:16px 32px;"><hr style="border:none;border-top:1px solid #e5e5e5;margin:0;" /></td></tr>`;

    case "spacer":
      return `<tr><td style="height:${(block.height as number) || 20}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;

    default:
      return "";
  }
}

/**
 * Render an array of blocks into a complete email HTML document.
 */
export function renderEmailTemplate(blocks: EmailBlock[], variables?: Record<string, string>): string {
  const rows = blocks.map(renderBlock).filter(Boolean).join("\n");

  // Collect Google Fonts used
  const googleFonts = new Set<string>();
  for (const b of blocks) {
    const ff = (b.fontFamily as string);
    if (ff && !["Arial", "Georgia", "Helvetica", "Times New Roman", "Verdana"].includes(ff)) {
      googleFonts.add(ff);
    }
  }
  const fontLink = googleFonts.size > 0
    ? `<link href="https://fonts.googleapis.com/css2?${Array.from(googleFonts).map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap" rel="stylesheet">`
    : "";

  let html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
${fontLink}
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f4f2;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f4f2;">
<tr><td align="center" style="padding:20px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;

  // Variable substitution
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escapeHtml(value));
    }
  }

  return html;
}

/**
 * Parse blocks JSON string safely.
 */
export function parseBlocks(blocksJson: string): EmailBlock[] {
  try {
    const parsed = JSON.parse(blocksJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
