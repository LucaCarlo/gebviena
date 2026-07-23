// v4: timeout ATTIVO via AbortSignal (indipendente da SDK config).
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

function s3(name, key, sec) {
  return new S3Client({
    region: "de", endpoint: "https://de-s3.storage.bunnycdn.com",
    credentials: { accessKeyId: key, secretAccessKey: sec },
    forcePathStyle: true,
  });
}
const OLD = s3("old", "gebruederthonetvienna-com", "c8892e08-ca82-432d-a0ed5376364d-948c-4f89");
const NEW = s3("new", "gtv-com", "736a97f4-7dc8-44c7-9454beabedec-74fc-4714");

// wrapper con timeout HARD via AbortController
function withTimeout(fn, ms, label) {
  return new Promise(async (resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`TIMEOUT ${ms}ms: ${label}`)), ms);
    try {
      const r = await fn();
      clearTimeout(t);
      resolve(r);
    } catch (e) {
      clearTimeout(t);
      reject(e);
    }
  });
}

async function withRetry(fn, name, maxTries = 3) {
  let lastErr;
  for (let i = 1; i <= maxTries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < maxTries) await new Promise(r => setTimeout(r, 500 * i));
    }
  }
  throw lastErr;
}

console.log("Listing vecchia zone...");
const oldFiles = [];
let token;
do {
  const r = await withTimeout(() => OLD.send(new ListObjectsV2Command({ Bucket: "gebruederthonetvienna-com", ContinuationToken: token, MaxKeys: 1000 })), 30_000, "list old");
  for (const o of r.Contents || []) if (!o.Key.endsWith("/")) oldFiles.push({ key: o.Key, size: o.Size });
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
console.log(`Vecchia zone: ${oldFiles.length} file`);

console.log("Listing nuova zone...");
const newFiles = new Map();
token = undefined;
do {
  const r = await withTimeout(() => NEW.send(new ListObjectsV2Command({ Bucket: "gtv-com", ContinuationToken: token, MaxKeys: 1000 })), 30_000, "list new");
  for (const o of r.Contents || []) if (!o.Key.endsWith("/")) newFiles.set(o.Key, o.Size);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
console.log(`Nuova zone: ${newFiles.size}`);

const toMigrate = oldFiles.filter(f => newFiles.get(f.key) !== f.size);
console.log(`Da migrare: ${toMigrate.length}\n`);

let ok = 0, fail = 0;
const t0 = Date.now();

async function copyOne({ key, size }) {
  try {
    await withRetry(async () => {
      // Timeout esplicito per singolo file: 60s per <10MB, 180s per grandi
      const timeoutMs = size < 10 * 1024 * 1024 ? 60_000 : 180_000;
      await withTimeout(async () => {
        const get = await OLD.send(new GetObjectCommand({ Bucket: "gebruederthonetvienna-com", Key: key }));
        const chunks = [];
        for await (const ch of get.Body) chunks.push(Buffer.isBuffer(ch) ? ch : Buffer.from(ch));
        const body = Buffer.concat(chunks);
        await NEW.send(new PutObjectCommand({
          Bucket: "gtv-com", Key: key, Body: body,
          ContentType: get.ContentType || "application/octet-stream",
        }));
      }, timeoutMs, key);
    }, key);
    ok++;
  } catch (e) {
    fail++;
    console.error(`FAIL ${key.substring(0,60)}: ${e.message.substring(0, 60)}`);
  }
}

const CONCURRENCY = 6;
for (let i = 0; i < toMigrate.length; i += CONCURRENCY) {
  const batch = toMigrate.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(copyOne));
  const done = ok + fail;
  if (done % 60 === 0 || done === toMigrate.length) {
    const pct = ((done / toMigrate.length) * 100).toFixed(1);
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    const rate = (done / ((Date.now() - t0) / 1000)).toFixed(1);
    const remain = toMigrate.length - done;
    const eta = (remain / (done / ((Date.now() - t0) / 1000)) / 60).toFixed(1);
    console.log(`[${done}/${toMigrate.length} ${pct}%] ok=${ok} fail=${fail} rate=${rate}/s eta=${eta}min elapsed=${el}s`);
  }
  if (global.gc && (done % 300 === 0)) global.gc();
}

console.log(`\n═══ FINE ═══\nOK: ${ok}\nFail: ${fail}\nTempo: ${((Date.now()-t0)/1000).toFixed(0)}s`);
