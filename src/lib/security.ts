import { prisma } from "@/lib/prisma";

// ─── Impostazioni Sicurezza / Anti-bot ───────────────────────────────────────
// Salvate in Setting con group="security", chiavi in snake_case.
// Cache in-memory 60s per non colpire il DB a ogni tracker POST.

export interface SecuritySettings {
  autoBanEnabled: boolean;
  hitsPerHourThreshold: number;      // >N hit/h da stesso IP -> ban
  hitsPerPathPerHourThreshold: number; // >N hit/h sullo stesso path da stesso IP -> ban
  autoBanDurationHours: number;      // durata ban automatico (0 = permanente)
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  autoBanEnabled: true,
  hitsPerHourThreshold: 300,
  hitsPerPathPerHourThreshold: 50,
  autoBanDurationHours: 168, // 7 giorni
};

let settingsCache: { data: SecuritySettings; expires: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

export function invalidateSecuritySettingsCache() {
  settingsCache = null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const now = Date.now();
  if (settingsCache && settingsCache.expires > now) return settingsCache.data;
  try {
    const row = await prisma.setting.findUnique({ where: { key: "security_settings" } });
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<SecuritySettings>;
      const merged: SecuritySettings = { ...DEFAULT_SECURITY_SETTINGS, ...parsed };
      settingsCache = { data: merged, expires: now + SETTINGS_TTL_MS };
      return merged;
    }
  } catch { /* fallback default */ }
  settingsCache = { data: DEFAULT_SECURITY_SETTINGS, expires: now + SETTINGS_TTL_MS };
  return DEFAULT_SECURITY_SETTINGS;
}

// ─── Blocklist IP ─────────────────────────────────────────────────────────────
// Cache in-memory (Set) delle chiavi bloccate + expiresAt per invalidazione.
// TTL cache = 30s (evita 1000+ query/sec al tracker).

interface BlocklistCache {
  set: Map<string, number | null>; // ipHash -> expiresAt (ms) o null (permanente)
  expires: number;
}
let blocklistCache: BlocklistCache | null = null;
const BLOCKLIST_TTL_MS = 30_000;

export function invalidateBlocklistCache() {
  blocklistCache = null;
}

async function loadBlocklist(): Promise<BlocklistCache> {
  const now = Date.now();
  if (blocklistCache && blocklistCache.expires > now) return blocklistCache;
  const rows = await prisma.blockedIp.findMany({
    select: { ipHash: true, expiresAt: true },
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
  const map = new Map<string, number | null>();
  for (const r of rows) map.set(r.ipHash, r.expiresAt ? r.expiresAt.getTime() : null);
  blocklistCache = { set: map, expires: now + BLOCKLIST_TTL_MS };
  return blocklistCache;
}

export async function isIpBlocked(ipHash: string | null | undefined): Promise<boolean> {
  if (!ipHash) return false;
  const cache = await loadBlocklist();
  const exp = cache.set.get(ipHash);
  if (exp === undefined) return false;
  if (exp === null) return true; // permanente
  return exp > Date.now();
}

// ─── Auto-ban check (asincrono, fire-and-forget dal tracker) ────────────────

export async function checkAndAutoBan(ipHash: string, path: string) {
  const settings = await getSecuritySettings();
  if (!settings.autoBanEnabled) return;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [totalHits, pathHits] = await Promise.all([
    prisma.pageView.count({ where: { ipHash, createdAt: { gte: oneHourAgo } } }),
    prisma.pageView.count({ where: { ipHash, path, createdAt: { gte: oneHourAgo } } }),
  ]);
  let reason: string | null = null;
  if (totalHits > settings.hitsPerHourThreshold) {
    reason = `Auto-ban: ${totalHits} hit/ora (soglia ${settings.hitsPerHourThreshold})`;
  } else if (pathHits > settings.hitsPerPathPerHourThreshold) {
    reason = `Auto-ban: ${pathHits} hit/ora su path ${path.slice(0, 60)} (soglia ${settings.hitsPerPathPerHourThreshold})`;
  }
  if (!reason) return;

  const expiresAt = settings.autoBanDurationHours > 0
    ? new Date(Date.now() + settings.autoBanDurationHours * 60 * 60 * 1000)
    : null;
  try {
    await prisma.blockedIp.upsert({
      where: { ipHash },
      create: { ipHash, reason, autoBanned: true, expiresAt },
      update: { reason, autoBanned: true, expiresAt, blockedAt: new Date() },
    });
    invalidateBlocklistCache();
  } catch { /* race condition safe: unique constraint */ }
}
