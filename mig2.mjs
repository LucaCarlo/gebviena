// Migra file uno alla volta, streaming, senza buffer completi in RAM.
// Concorrenza controllata con batch. Auto-resume: skip file già presenti.
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const OLD = new S3Client({
  region: "de", endpoint: "https://de-s3.storage.bunnycdn.com",
  credentials: { accessKeyId: "gebruederthonetvienna-com", secretAccessKey: "c8892e08-ca82-432d-a0ed5376364d-948c-4f89" },
  forcePathStyle: true,
});
const NEW = new S3Client({
  region: "de", endpoint: "https://de-s3.storage.bunnycdn.com",
  credentials: { accessKeyId: "gtv-com", secretAccessKey: "736a97f4-7dc8-44c7-9454beabedec-74fc-4714" },
  forcePathStyle: true,
});

console.log("Listing vecchia zone...");
const files = [];
let token;
do {
  const r = await OLD.send(new ListObjectsV2Command({ Bucket: "gebruederthonetvienna-com", ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents || []) if (!o.Key.endsWith("/")) files.push({ key: o.Key, size: o.Size });
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
console.log(`${files.length} file da migrare (${(files.reduce((a,f)=>a+f.size,0)/1024/1024).toFixed(1)} MB)\n`);

let ok = 0, skip = 0, fail = 0;
const t0 = Date.now();

// Batch di CONCURRENCY file in parallelo
const CONCURRENCY = 4;
async function processOne({ key, size }) {
  // skip se esiste già
  try {
    const h = await NEW.send(new HeadObjectCommand({ Bucket: "gtv-com", Key: key }));
    if (h.ContentLength === size) { skip++; return; }
  } catch (_) { /* non c'è, procedo */ }

  try {
    // File piccoli (<10MB): buffer normale
    // File grandi (>=10MB): streaming
    if (size < 10 * 1024 * 1024) {
      const get = await OLD.send(new GetObjectCommand({ Bucket: "gebruederthonetvienna-com", Key: key }));
      const chunks = [];
      for await (const ch of get.Body) chunks.push(Buffer.isBuffer(ch) ? ch : Buffer.from(ch));
      const body = Buffer.concat(chunks);
      await NEW.send(new PutObjectCommand({
        Bucket: "gtv-com", Key: key, Body: body,
        ContentType: get.ContentType || "application/octet-stream",
      }));
    } else {
      // File grandi via streaming
      const get = await OLD.send(new GetObjectCommand({ Bucket: "gebruederthonetvienna-com", Key: key }));
      await NEW.send(new PutObjectCommand({
        Bucket: "gtv-com", Key: key, Body: get.Body,
        ContentLength: size, ContentType: get.ContentType || "application/octet-stream",
      }));
    }
    ok++;
  } catch (e) {
    fail++;
    console.error(`FAIL ${key}: ${e.message}`);
  }
}

// Processa in batch di CONCURRENCY
for (let i = 0; i < files.length; i += CONCURRENCY) {
  const batch = files.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processOne));
  const done = ok + skip + fail;
  if (done % 40 === 0 || done === files.length) {
    const pct = ((done / files.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const rate = done > 0 ? (done / (Date.now() - t0) * 1000).toFixed(1) : 0;
    const eta = done > 0 ? (((files.length - done) / (done / ((Date.now() - t0) / 1000))) / 60).toFixed(1) : "?";
    console.log(`[${done}/${files.length} ${pct}%] ok=${ok} skip=${skip} fail=${fail}  rate=${rate}/s  eta=${eta}min  elapsed=${elapsed}s`);
  }
  // Force GC ogni 200 file
  if (global.gc && done % 200 === 0) global.gc();
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n═══ RIEPILOGO ═══\nTotale: ${files.length}\nOK:     ${ok}\nSkip:   ${skip}\nFail:   ${fail}\nTempo:  ${elapsed}s`);
