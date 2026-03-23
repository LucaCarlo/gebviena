const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch {
  require('child_process').execSync('npm install sharp --no-save', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  sharp = require('sharp');
}

const SIZE = 200;
const C = SIZE / 2;

async function makeIcon(svgContent) {
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <circle cx="${C}" cy="${C}" r="${C}" fill="#000"/>
    ${svgContent}
  </svg>`;
  const png = await sharp(Buffer.from(fullSvg)).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function main() {
  const R = SIZE * 0.22;

  const icons = {};

  // Globe
  icons.WEB = await makeIcon(`
    <circle cx="${C}" cy="${C}" r="${R*2}" stroke="white" stroke-width="5" fill="none"/>
    <ellipse cx="${C}" cy="${C}" rx="${R}" ry="${R*2}" stroke="white" stroke-width="5" fill="none"/>
    <line x1="${C - R*2}" y1="${C}" x2="${C + R*2}" y2="${C}" stroke="white" stroke-width="5"/>
    <path d="M${C - R*1.85} ${C - R*0.9} Q${C} ${C - R*1.2} ${C + R*1.85} ${C - R*0.9}" stroke="white" stroke-width="3.5" fill="none"/>
    <path d="M${C - R*1.85} ${C + R*0.9} Q${C} ${C + R*1.2} ${C + R*1.85} ${C + R*0.9}" stroke="white" stroke-width="3.5" fill="none"/>
  `);

  // Instagram
  const inset = SIZE * 0.27;
  const boxSize = SIZE - inset * 2;
  const cornerR = boxSize * 0.28;
  const lensR = boxSize * 0.22;
  icons.INSTAGRAM = await makeIcon(`
    <rect x="${inset}" y="${inset}" width="${boxSize}" height="${boxSize}" rx="${cornerR}" stroke="white" stroke-width="7" fill="none"/>
    <circle cx="${C}" cy="${C}" r="${lensR}" stroke="white" stroke-width="7" fill="none"/>
    <circle cx="${C + boxSize*0.28}" cy="${C - boxSize*0.28}" r="${boxSize*0.065}" fill="white"/>
  `);

  // LinkedIn — proper "in" using path instead of text for consistency
  icons.LINKEDIN = await makeIcon(`
    <rect x="55" y="82" width="16" height="52" rx="1" fill="white"/>
    <circle cx="63" cy="70" r="10" fill="white"/>
    <path d="M90 134h16v-28c0-18-8-28-22-28-10 0-15 6-17 10v-8H51s0 4 0 52h16v-28c0-2 0-4 1-5 2-5 6-9 12-9 8 0 10 6 10 15z" fill="white"/>
  `);

  // Facebook — proper "f" path
  icons.FACEBOOK = await makeIcon(`
    <path d="M112 56H96c-2.2 0-4 1.8-4 4v12H72v20h20v52h20V92h16l4-20H92V64h20V56z" fill="white"/>
  `);

  // Pinterest — proper "P" path
  icons.PINTEREST = await makeIcon(`
    <path d="M100 52c-27 0-40 19-40 35 0 10 3.5 18 11 21 1.2.5 2.4 0 2.8-1.5l1-4c.4-1.4.2-2-.8-3.2-2.2-2.5-3.5-5.8-3.5-10.4 0-20 15-38 39-38 21 0 33 13 33 30.5 0 23-10 42-25 42-8 0-14-6.6-12-14.8 2.4-9.6 7-20 7-27 0-6.2-3.4-11.4-10.2-11.4-8 0-14.8 8.4-14.8 19.6 0 7 2.4 12 2.4 12l-9.6 41c-2.8 12-.4 27-.2 28 .2.8 1 1 1.4.4.6-.8 8-10 10.6-19l4-15.4c2 3.8 7.6 7 13.6 7 18 0 30-16.4 30-38.4C134.8 70 120 52 100 52z" fill="white"/>
  `);

  // Now patch the signatureRenderer.ts file
  const filePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'firma', '_components', 'signatureRenderer.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace each icon
  const oldBlock = content.match(/\/\/ B&W social icons.*?(?=\n\n)/s)[0];

  const newBlock = `// B&W social icons — PNG rendered via sharp for crisp quality
const ICON_WEB_BW =\n  "${icons.WEB}";

const ICON_INSTAGRAM_BW =\n  "${icons.INSTAGRAM}";

const ICON_LINKEDIN_BW =\n  "${icons.LINKEDIN}";

const ICON_FACEBOOK_BW =\n  "${icons.FACEBOOK}";

const ICON_PINTEREST_BW =\n  "${icons.PINTEREST}";`;

  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Icons patched successfully!');
}

main().catch(console.error);
