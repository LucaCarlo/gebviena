/**
 * Meta Conversions API (CAPI) — server-side event sending.
 *
 * Per ogni evento mandato sia client (pixel) sia server (CAPI), Meta deduplica
 * usando event_name + event_id se coincidono. Quindi il chiamante DEVE passare
 * lo stesso event_id che usa lato client.
 *
 * Settings richieste (group store_general):
 *   - store.fb_pixel_id                  (riusato dal pixel client)
 *   - store.fb_capi_access_token         (segreto, generato in Events Manager)
 *   - store.fb_capi_test_event_code      (opzionale, per debugging in Test Events)
 *
 * Doc: https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const GRAPH_API_VERSION = "v18.0";

interface CapiConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string | null;
}

let cachedConfig: { value: CapiConfig | null; ts: number } | null = null;
const CONFIG_TTL_MS = 60_000;

async function loadConfig(): Promise<CapiConfig | null> {
  if (cachedConfig && Date.now() - cachedConfig.ts < CONFIG_TTL_MS) return cachedConfig.value;
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["store.fb_pixel_id", "store.fb_capi_access_token", "store.fb_capi_test_event_code"] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const pixelId = (map.get("store.fb_pixel_id") || "").trim();
  const accessToken = (map.get("store.fb_capi_access_token") || "").trim();
  const testEventCode = (map.get("store.fb_capi_test_event_code") || "").trim() || null;
  const value = pixelId && accessToken ? { pixelId, accessToken, testEventCode } : null;
  cachedConfig = { value, ts: Date.now() };
  return value;
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
}

function normalizePhone(p: string): string {
  // Solo cifre, niente + né spazi né separatori
  return p.replace(/\D/g, "");
}

export interface CapiUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null; // ISO 3166-1 alpha-2 (es. "IT")
  clientIp?: string | null;
  clientUserAgent?: string | null;
  externalId?: string | null; // customerId interno per match esteso
  fbp?: string | null; // _fbp cookie value
  fbc?: string | null; // _fbc cookie value
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
  search_string?: string;
}

export interface CapiEvent {
  eventName: "Purchase" | "AddPaymentInfo" | "AddToCart" | "InitiateCheckout" | "ViewContent" | "Lead" | "AddToWishlist" | "Search";
  eventId: string; // serve per dedup con pixel client
  eventTime?: number; // unix seconds; default now
  eventSourceUrl?: string;
  actionSource?: "website" | "email" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
  userData: CapiUserData;
  customData?: CapiCustomData;
}

function hashUserData(u: CapiUserData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (u.email) out.em = sha256(u.email);
  if (u.phone) {
    const norm = normalizePhone(u.phone);
    if (norm) out.ph = sha256(norm);
  }
  if (u.firstName) out.fn = sha256(u.firstName);
  if (u.lastName) out.ln = sha256(u.lastName);
  if (u.city) out.ct = sha256(u.city);
  if (u.postalCode) out.zp = sha256(u.postalCode);
  if (u.country) out.country = sha256(u.country);
  if (u.externalId) out.external_id = sha256(u.externalId);
  // ip + ua + fbp + fbc passano in chiaro (non sono PII hashed)
  if (u.clientIp) out.client_ip_address = u.clientIp;
  if (u.clientUserAgent) out.client_user_agent = u.clientUserAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

/**
 * Invia un evento server-side a Meta CAPI. Se il pixel id o l'access token
 * non sono configurati, la funzione è no-op (return false). NON THROW: per
 * design CAPI non deve mai bloccare un flusso transazionale.
 */
export async function sendCapiEvent(ev: CapiEvent): Promise<boolean> {
  try {
    const cfg = await loadConfig();
    if (!cfg) {
      // Pixel/token non configurati → silent no-op
      return false;
    }

    const payload: Record<string, unknown> = {
      event_name: ev.eventName,
      event_time: ev.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: ev.eventId,
      action_source: ev.actionSource ?? "website",
      user_data: hashUserData(ev.userData),
    };
    if (ev.eventSourceUrl) payload.event_source_url = ev.eventSourceUrl;
    if (ev.customData) payload.custom_data = ev.customData;

    const body: Record<string, unknown> = {
      data: [payload],
      access_token: cfg.accessToken,
    };
    if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${cfg.pixelId}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[fb-capi] ${ev.eventName} failed status=${res.status}:`, txt.slice(0, 300));
      return false;
    }
    console.log(`[fb-capi] ${ev.eventName} sent · event_id=${ev.eventId}`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[fb-capi] ${ev.eventName} error:`, msg);
    return false;
  }
}

/**
 * Helper specifico Purchase. Da chiamare quando un ordine passa a stato PAID.
 * Calcola value/currency dall'Order, fornisce user_data hashato.
 */
export async function sendCapiPurchase(orderId: string, req: { headers: { get(name: string): string | null } } | null = null): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      totalCents: true,
      currency: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      customerId: true,
      shippingAddress: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });
  if (!order) return false;

  let city: string | null = null;
  let postalCode: string | null = null;
  let country: string | null = null;
  try {
    const addr = JSON.parse(order.shippingAddress || "{}") as { city?: string; postalCode?: string; country?: string };
    city = addr.city || null;
    postalCode = addr.postalCode || null;
    country = addr.country || null;
  } catch { /* */ }

  return sendCapiEvent({
    eventName: "Purchase",
    eventId: order.orderNumber,
    actionSource: "website",
    userData: {
      email: order.email,
      phone: order.phone,
      firstName: order.firstName,
      lastName: order.lastName,
      city,
      postalCode,
      country,
      externalId: order.customerId,
      clientIp: req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      clientUserAgent: req?.headers.get("user-agent") || null,
    },
    customData: {
      value: order.totalCents / 100,
      currency: order.currency,
      content_type: "product",
      content_ids: order.items.map((i) => i.variantId).filter((x): x is string => !!x),
      num_items: order.items.reduce((s, i) => s + i.quantity, 0),
      order_id: order.orderNumber,
    },
  });
}
