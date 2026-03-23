// Generate B&W social icons as base64 PNG using sharp
const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('sharp not found, installing...');
  require('child_process').execSync('npm install sharp --no-save', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  sharp = require('sharp');
}

const SIZE = 200; // big enough for crisp rendering

async function createIcon(name, svgContent) {
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="#000"/>
    ${svgContent}
  </svg>`;

  const png = await sharp(Buffer.from(fullSvg)).png().toBuffer();
  const b64 = `data:image/png;base64,${png.toString('base64')}`;
  console.log(`const ICON_${name} =\n  "${b64}";\n`);
}

async function main() {
  const C = SIZE / 2; // center
  const R = SIZE * 0.22; // icon radius area

  // WEB - Globe icon
  await createIcon('WEB_BW', `
    <circle cx="${C}" cy="${C}" r="${R*2}" stroke="white" stroke-width="5" fill="none"/>
    <ellipse cx="${C}" cy="${C}" rx="${R}" ry="${R*2}" stroke="white" stroke-width="5" fill="none"/>
    <line x1="${C - R*2}" y1="${C}" x2="${C + R*2}" y2="${C}" stroke="white" stroke-width="5"/>
    <path d="M${C - R*1.85} ${C - R*0.9} Q${C} ${C - R*1.2} ${C + R*1.85} ${C - R*0.9}" stroke="white" stroke-width="4" fill="none"/>
    <path d="M${C - R*1.85} ${C + R*0.9} Q${C} ${C + R*1.2} ${C + R*1.85} ${C + R*0.9}" stroke="white" stroke-width="4" fill="none"/>
  `);

  // INSTAGRAM - Camera icon
  const inset = SIZE * 0.27;
  const boxSize = SIZE - inset * 2;
  const cornerR = boxSize * 0.28;
  const lensR = boxSize * 0.22;
  await createIcon('INSTAGRAM_BW', `
    <rect x="${inset}" y="${inset}" width="${boxSize}" height="${boxSize}" rx="${cornerR}" stroke="white" stroke-width="6" fill="none"/>
    <circle cx="${C}" cy="${C}" r="${lensR}" stroke="white" stroke-width="6" fill="none"/>
    <circle cx="${C + boxSize*0.28}" cy="${C - boxSize*0.28}" r="${boxSize*0.06}" fill="white"/>
  `);

  // LINKEDIN - "in" bold
  await createIcon('LINKEDIN_BW', `
    <text x="${C}" y="${C + SIZE*0.12}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${SIZE*0.42}" fill="white" letter-spacing="-2">in</text>
  `);

  // FACEBOOK - "f" bold
  await createIcon('FACEBOOK_BW', `
    <text x="${C}" y="${C + SIZE*0.16}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${SIZE*0.52}" fill="white">f</text>
  `);

  // PINTEREST - script "P"
  await createIcon('PINTEREST_BW', `
    <text x="${C}" y="${C + SIZE*0.15}" text-anchor="middle" font-family="Georgia,Times New Roman,serif" font-weight="700" font-style="italic" font-size="${SIZE*0.52}" fill="white">P</text>
  `);
}

main().catch(console.error);
