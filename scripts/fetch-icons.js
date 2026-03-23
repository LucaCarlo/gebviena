const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const SIZE = 200;
const PADDING = 50; // padding inside circle for the icon

// Simple Icons CDN - official brand SVG paths
const ICONS = {
  WEB: 'https://cdn.simpleicons.org/googlechrome/white',      // globe-like
  INSTAGRAM: 'https://cdn.simpleicons.org/instagram/white',
  LINKEDIN: 'https://cdn.simpleicons.org/linkedin/white',
  FACEBOOK: 'https://cdn.simpleicons.org/facebook/white',
  PINTEREST: 'https://cdn.simpleicons.org/pinterest/white',
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function makeIcon(name, svgUrl) {
  console.log(`Fetching ${name}...`);
  const svgData = await fetch(svgUrl);

  // Create the icon: black circle bg + white brand icon centered
  const iconSize = SIZE - PADDING * 2;
  const compositeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="#000"/>
  </svg>`;

  // Resize the brand SVG to fit inside the circle
  const brandPng = await sharp(Buffer.from(svgData))
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  const bgPng = await sharp(Buffer.from(compositeSvg))
    .png()
    .toBuffer();

  // Composite: black circle + white icon on top
  const final = await sharp(bgPng)
    .composite([{ input: brandPng, left: PADDING, top: PADDING }])
    .png()
    .toBuffer();

  return 'data:image/png;base64,' + final.toString('base64');
}

// Alternative: use a simple globe SVG for web instead of Chrome
const GLOBE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm7.5 9h-3.02c-.1-2.09-.56-4.03-1.32-5.6A8.03 8.03 0 0 1 19.5 11zM12 20c-.83 0-2.17-2.33-2.44-7h4.88c-.27 4.67-1.61 7-2.44 7zm-2.48-9c.28-4.55 1.55-7 2.48-7s2.2 2.45 2.48 7H9.52zM8.84 5.4C8.08 6.97 7.62 8.91 7.52 11H4.5A8.03 8.03 0 0 1 8.84 5.4zM4.5 13h3.02c.1 2.09.56 4.03 1.32 5.6A8.03 8.03 0 0 1 4.5 13zm10.66 5.6c.76-1.57 1.22-3.51 1.32-5.6h3.02a8.03 8.03 0 0 1-4.34 5.6z"/>
</svg>`;

async function main() {
  const icons = {};

  // Globe (web) - use custom SVG
  console.log('Creating WEB icon...');
  const globePng = await sharp(Buffer.from(GLOBE_SVG)).resize(100, 100).png().toBuffer();
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="#000"/></svg>`;
  const bgPng = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  icons.WEB = 'data:image/png;base64,' + (await sharp(bgPng).composite([{ input: globePng, left: PADDING, top: PADDING }]).png().toBuffer()).toString('base64');

  // Fetch real brand icons
  for (const [name, url] of Object.entries(ICONS)) {
    if (name === 'WEB') continue;
    icons[name] = await makeIcon(name, url);
  }

  // Patch the file
  const file = path.join(__dirname, '..', 'src', 'app', 'admin', 'firma', '_components', 'signatureRenderer.ts');
  let content = fs.readFileSync(file, 'utf8');

  const startMarker = '// B&W social icons';
  const endMarker = 'function escapeHtml';
  const si = content.indexOf(startMarker);
  const ei = content.indexOf(endMarker);

  if (si === -1 || ei === -1) {
    console.error('Markers not found!');
    process.exit(1);
  }

  const newBlock = `// B&W social icons — official brand icons (PNG, black circle + white icon)
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
  console.log('All icons patched!');
}

main().catch(console.error);
