import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// POST: receives a base64 logo, returns a PNG with white glow baked in
export async function POST(req: NextRequest) {
  try {
    const { logoBase64 } = await req.json();
    if (!logoBase64) {
      return NextResponse.json({ error: "Missing logoBase64" }, { status: 400 });
    }

    // Strip data URI prefix
    const base64Data = logoBase64.replace(/^data:image\/[^;]+;base64,/, "");
    const inputBuf = Buffer.from(base64Data, "base64");

    // Render to PNG at high res
    const logoPng = await sharp(inputBuf, { density: 300 })
      .resize(520, null)
      .ensureAlpha()
      .png()
      .toBuffer();

    const meta = await sharp(logoPng).metadata();
    const w = meta.width!;
    const h = meta.height!;

    // Create white (inverted) version for glow
    const whiteLogo = await sharp(logoPng)
      .negate({ alpha: false })
      .png()
      .toBuffer();

    // Blur the white version for soft glow
    const glowLayer = await sharp(whiteLogo)
      .blur(12)
      .png()
      .toBuffer();

    // Add padding for glow to extend beyond logo edges
    const pad = 30;
    const finalW = w + pad * 2;
    const finalH = h + pad * 2;

    // Composite: transparent bg -> double blurred glow -> original logo
    const resultBuf = await sharp({
      create: {
        width: finalW,
        height: finalH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: glowLayer, top: pad, left: pad, blend: "over" },
        { input: glowLayer, top: pad, left: pad, blend: "over" },
        { input: logoPng, top: pad, left: pad, blend: "over" },
      ])
      .png()
      .toBuffer();

    // Return as base64 data URI
    const resultBase64 = `data:image/png;base64,${resultBuf.toString("base64")}`;

    return NextResponse.json({ glowLogoBase64: resultBase64 });
  } catch (error) {
    console.error("Error generating glow logo:", error);
    return NextResponse.json(
      { error: "Failed to generate glow logo" },
      { status: 500 }
    );
  }
}
