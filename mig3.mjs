// v3: timeout esplicito 60s per operazione, retry 3x, resume da nuova zone.
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpsAgent } from "https";

const httpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 20 });
const handler = new NodeHttpHandler({
  httpsAgent,
  connectionTimeout: 30_000,
  requestTimeout: 90_000,
});

const OLD = new S3Client({
  region: "de", endpoint: "https://de-s3.storage.bunnycdn.com",
  credentials: { accessKeyId: "gebruederthonetvienna-com", secretAccessKey: "c8892e08-ca82-432d-a0ed5376364d-948c-4f89" },
  forcePathStyle: true, requestHandler: handler,
});
const NEW = new S3Client({
  region: "de", endpoint: "https://de-s3.storage.bunnycdn.com",
  credentials: { accessKeyId: "gtv-com", secretAccessKey: "736a97f4-7dc8-44c7-9454beabedec-74fc-4714" },
  forcePathStyle: true, requestHandler: handler,
});

async function withRetry(fn, name, maxTries = 3) {
  let lastErr;
  for (let i = 1; i <= maxTries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < maxTries) await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

console.log("Listing vecchia zone...");
const oldFiles = [];
let token;
do {
  const r = await OLD.send(new ListObjectsV2Command({ Bucket: "gebruederthonetvienna-com", ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents || []) if (!o.Key.endsWith("/")) oldFiles.push({ key: o.Key, size: o.Size });
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
console.log(`Vecchia zone: ${oldFiles.length} file`);

console.log("Listing nuova zone (per skip auto)...");
const newFiles = new Map();
token = undefined;
do {
  const r = await NEW.send(new ListObjectsV2Command({ Bucket: "gtv-com", ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents || []) if (!o.Key.endsWith("/")) newFiles.set(o.Key, o.Size);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
console.log(`Nuova zone: ${newFiles.size} file gia presenti\n`);

// Filtra solo i file NON ancora migrati (o con dimensione diversa)
const toMigrate = oldFiles.filter(f => newFiles.get(f.key) !== f.size);
const totalBytes = toMigrate.reduce((a,f)=>a+f.size, 0);
console.log(`Da migrare: ${toMigrate.length} file (${(totalBytes/1024/1024).toFixed(1)} MB)\n`);

let ok = 0, fail = 0;
const t0 = Date.now();

const CONCURRENCY = 6;

async function copyOne({ key, size }) {
  try {
    await withRetry(async () => {
      const get = await OLD.send(new GetObjectCommand({ Bucket: "gebruederthonetvienna-com", Key: key }));
      // Piccoli (<8MB): buffer + Put diretto
      // Grandi: buffer comunque (streaming ha problemi con signing)
      const chunks = [];
      for await (const ch of get.Body) chunks.push(Buffer.isBuffer(ch) ? ch : Buffer.from(ch));
      const body = Buffer.concat(chunks);
      await NEW.send(new PutObjectCommand({
        Bucket: "gtv-com", Key: key, Body: body,
        ContentType: get.ContentType || "application/octet-stream",
      }));
    }, key);
    ok++;
  } catch (e) {
    fail++;
    console.error(`FAIL ${key}: ${e.message.substring(0, 80)}`);
  }
}

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

console.log(`\n═══ RIEPILOGO ═══\nOK: ${ok}\nFail: ${fail}\nTempo: ${((Date.now()-t0)/1000).toFixed(0)}s`);
