const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZE = 200;
const ICON_SIZE = 110;
const PAD = Math.round((SIZE - ICON_SIZE) / 2);

// Simple approach: download real icons from a reliable source (unpkg/lucide)
// These are the standard Lucide icons used everywhere

async function makeIconFromSvg(svgString) {
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="#000"/></svg>`;
  const bgPng = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  const iconPng = await sharp(Buffer.from(svgString)).resize(ICON_SIZE, ICON_SIZE).png().toBuffer();
  const final = await sharp(bgPng)
    .composite([{ input: iconPng, left: PAD, top: PAD }])
    .png()
    .toBuffer();
  return 'data:image/png;base64,' + final.toString('base64');
}

// Clean, proven SVG icons - simple and recognizable
const SVGS = {
  // Globe - simple clean globe
  WEB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,

  // Instagram - standard camera icon
  INSTAGRAM: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none"/></svg>`,

  // LinkedIn - bold "in"
  LINKEDIN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="9" width="4" height="12" rx="0.5" fill="white"/><circle cx="4" cy="4.5" r="2.5" fill="white"/><path d="M10 21h4v-6.5c0-2.5 1-3.5 2.5-3.5s2.5 1 2.5 3.5V21h4v-7c0-4-2-6-5-6-2 0-3.5 1-4 2.5V9h-4v12z" fill="white"/></svg>`,

  // Facebook - same f as before, shifted right 3px to center it visually
  FACEBOOK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 2h-3c-2.76 0-5 2.24-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7c0-.55.45-1 1-1h3V2z" fill="white"/></svg>`,

  // Pinterest - the P
  PINTEREST: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.08 2.46 7.58 5.97 9.12-.08-.72-.16-1.83.03-2.62l1.14-4.83s-.29-.58-.29-1.44c0-1.35.78-2.36 1.76-2.36.83 0 1.23.62 1.23 1.37 0 .84-.53 2.08-.81 3.24-.23.97.49 1.76 1.45 1.76 1.73 0 3.06-1.83 3.06-4.47 0-2.34-1.68-3.97-4.08-3.97-2.78 0-4.41 2.08-4.41 4.24 0 .84.32 1.74.73 2.23.08.1.09.18.07.28l-.27 1.11c-.04.18-.15.22-.34.13-1.26-.59-2.05-2.42-2.05-3.9 0-3.17 2.3-6.08 6.64-6.08 3.49 0 6.2 2.49 6.2 5.81 0 3.47-2.19 6.26-5.22 6.26-1.02 0-1.98-.53-2.31-1.16l-.63 2.39c-.23.88-.84 1.98-1.25 2.65.94.29 1.94.45 2.97.45 5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>`,
};

async function main() {
  console.log('Generating clean icons...');
  const icons = {};

  for (const [name, svg] of Object.entries(SVGS)) {
    icons[name] = await makeIconFromSvg(svg);
    console.log(`  ${name} done`);
  }

  const file = path.join(__dirname, '..', 'src', 'app', 'admin', 'firma', '_components', 'signatureRenderer.ts');
  let content = fs.readFileSync(file, 'utf8');
  const si = content.indexOf('// B&W social icons');
  const ei = content.indexOf('function escapeHtml');
  if (si === -1 || ei === -1) { console.error('Markers not found!'); process.exit(1); }

  const newBlock = `// B&W social icons — clean PNG (black circle + white icon)
const ICON_WEB_BW =
  "${icons.WEB}";

const ICON_INSTAGRAM_BW =
  "${icons.INSTAGRAM}";

const ICON_LINKEDIN_BW =
  "${icons.LINKEDIN}";

const ICON_FACEBOOK_BW =
  "${icons.FACEBOOK}";

const ICON_PINTEREST_BW =
  "${icons.PINTEREST}";

`;
  content = content.substring(0, si) + newBlock + content.substring(ei);
  fs.writeFileSync(file, content, 'utf8');
  console.log('All done!');
}

main().catch(console.error);
