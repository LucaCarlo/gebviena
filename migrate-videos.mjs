// Migra tutti i video da /uploads/ (o Bunny Storage) a Bunny Stream.
// Per ogni video:
// 1. Legge il file (locale se disponibile, altrimenti download CDN)
// 2. createStreamVideo + uploadStreamVideoBinary
// 3. Attende encoding
// 4. Aggiorna MediaFile + swap URL in TUTTE le tabelle referenti
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// Config Stream dal DB
const settings = await prisma.setting.findMany({ where: { group: "storage" } });
const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
const LIB = cfg.bunny_stream_library_id;
const KEY = cfg.bunny_stream_api_key;
const HOST = cfg.bunny_stream_hostname;
if (!LIB || !KEY || !HOST) { console.error("Stream config mancante"); process.exit(1); }
console.log(`[cfg] library=${LIB} host=${HOST}\n`);

const BASE = "https://video.bunnycdn.com";

async function api(method, path, body, contentType = "application/json") {
  const headers = { AccessKey: KEY, accept: "application/json" };
  if (body != null) headers["content-type"] = contentType;
  const res = await fetch(`${BASE}/library/${LIB}${path}`, { method, headers, body });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${(await res.text()).substring(0,150)}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? await res.json() : {};
}

async function createVideo(title) {
  return await api("POST", "/videos", JSON.stringify({ title }));
}
async function uploadVideoBinary(guid, buffer, contentType) {
  await api("PUT", `/videos/${guid}`, buffer, contentType);
}
async function getVideoInfo(guid) {
  return await api("GET", `/videos/${guid}`);
}
async function waitReady(guid, maxMs = 300_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const info = await getVideoInfo(guid);
    if (info.status === 4) return info;
    if (info.status === 5 || info.status === 6) throw new Error(`encoding failed status=${info.status}`);
    await new Promise(r => setTimeout(r, 5000));
  }
  return await getVideoInfo(guid);
}

async function readLocalOrCDN(file) {
  // 1) Try local disk
  const candidates = [
    `/uploads/${file.filename}`,
    `/uploads/${file.folder}/${file.filename}`,
  ];
  for (const p of candidates) {
    try { return await readFile(path.join(process.cwd(), "public", p)); }
    catch {}
  }
  // 2) Fallback: download da URL corrente (che è CDN Bunny)
  if (file.url.startsWith("http")) {
    const res = await fetch(file.url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

function buildMp4(guid, quality) { return `https://${HOST}/${guid}/play_${quality}.mp4`; }
function buildIframe(guid) { return `https://iframe.mediadelivery.net/embed/${LIB}/${guid}?autoplay=false&preload=true`; }
function buildThumb(guid) { return `https://${HOST}/${guid}/thumbnail.jpg`; }

// Tabelle in cui potrebbero apparire URL di video (fatto con REPLACE stringa)
const TARGETS = [
  { table: "MediaFile", cols: ["url", "wasabiUrl"] },
  { table: "HeroSlide", cols: ["videoUrl"] },
  { table: "Campaign", cols: ["videoUrl", "blocks"] },
  { table: "CampaignTranslation", cols: ["blocks"] },
  { table: "NewsArticle", cols: ["content", "blocks"] },
  { table: "NewsArticleTranslation", cols: ["content", "blocks"] },
  { table: "EmailTemplate", cols: ["content", "blocks"] },
];

const videos = await prisma.mediaFile.findMany({
  where: { mimeType: { startsWith: "video/" } },
  orderBy: { size: "asc" }, // parto dai piccoli
});
console.log(`Video da migrare: ${videos.length}\n`);

let ok = 0, fail = 0;
const results = [];
const t0 = Date.now();

for (const [idx, file] of videos.entries()) {
  const prefix = `[${idx+1}/${videos.length}]`;
  console.log(`${prefix} ${file.filename} (${(file.size/1024/1024).toFixed(1)} MB)`);

  try {
    // 1) Leggi file
    const buf = await readLocalOrCDN(file);
    if (!buf) throw new Error("File non disponibile (né locale né CDN)");
    console.log(`  ✓ Letto ${(buf.length/1024/1024).toFixed(1)} MB`);

    // 2) Crea video su Bunny Stream
    const title = file.filename.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
    const created = await createVideo(title);
    console.log(`  ✓ Creato Stream guid=${created.guid}`);

    // 3) Upload binario
    await uploadVideoBinary(created.guid, buf, file.mimeType);
    console.log(`  ✓ Upload binario ok`);

    // 4) Aspetta encoding
    console.log(`  … Encoding in corso...`);
    const info = await waitReady(created.guid, 300_000);
    if (info.status !== 4) {
      console.warn(`  ⚠ Encoding non completato in tempo (status=${info.status}), procedo comunque`);
    } else {
      console.log(`  ✓ Encoding completato (${info.length}s, ${info.availableResolutions})`);
    }

    // 5) Costruisci nuove URL
    const resolutions = (info.availableResolutions || "").split(",").map(r => r.trim()).filter(Boolean);
    const preferred = ["720p", "1080p", "480p", "360p", "240p"];
    const best = preferred.find(q => resolutions.includes(q)) || "720p";
    const newUrl = buildMp4(created.guid, best);
    const iframeUrl = buildIframe(created.guid);
    const thumbUrl = buildThumb(created.guid);
    const oldUrl = file.url;

    // 6) UPDATE MediaFile con nuovi campi
    await prisma.mediaFile.update({
      where: { id: file.id },
      data: {
        url: newUrl,
        wasabiKey: created.guid,
        wasabiUrl: iframeUrl,
        thumbnailUrl: thumbUrl,
        width: info.width || file.width,
        height: info.height || file.height,
        isSynced: true,
        syncedAt: new Date(),
      },
    });

    // 7) Swap URL in tutte le altre tabelle (REPLACE stringa esatta)
    let replaceCount = 0;
    for (const { table, cols } of TARGETS) {
      for (const col of cols) {
        try {
          const r = await prisma.$executeRawUnsafe(
            `UPDATE \`${table}\` SET \`${col}\` = REPLACE(\`${col}\`, ?, ?) WHERE \`${col}\` LIKE ?`,
            oldUrl, newUrl, `%${oldUrl}%`
          );
          if (r > 0) replaceCount += r;
        } catch (e) {
          if (!String(e.message).includes("Unknown column") && !String(e.message).includes("doesn't exist")) {
            console.error(`  ⚠ ${table}.${col} err: ${e.message.substring(0,60)}`);
          }
        }
      }
    }
    console.log(`  ✓ Swap URL in DB: ${replaceCount} righe aggiornate`);

    ok++;
    results.push({ filename: file.filename, guid: created.guid, quality: best, ok: true });
  } catch (e) {
    fail++;
    console.error(`  ✗ FAIL: ${e.message}`);
    results.push({ filename: file.filename, error: e.message, ok: false });
  }
  console.log();
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n═══════════════════════════════════════`);
console.log(`RIEPILOGO`);
console.log(`═══════════════════════════════════════`);
console.log(`OK: ${ok}`);
console.log(`Fail: ${fail}`);
console.log(`Tempo: ${elapsed}s\n`);
for (const r of results) {
  if (r.ok) console.log(`  ✓ ${r.filename.substring(0,60)} → ${r.guid} (${r.quality})`);
  else console.log(`  ✗ ${r.filename.substring(0,60)}: ${r.error}`);
}
await prisma.$disconnect();
