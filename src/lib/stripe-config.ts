import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

let _stripeInstance: Stripe | null = null;
let _cachedSecretKey: string | null = null;

export interface StoreStripeConfig {
  mode: "test" | "live";
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

async function loadSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getStripeConfig(): Promise<StoreStripeConfig> {
  const map = await loadSettings([
    "store.stripe.mode",
    "store.stripe.publishable_key",
    "store.stripe.secret_key",
    "store.stripe.webhook_secret",
  ]);
  return {
    mode: (map["store.stripe.mode"] === "live" ? "live" : "test"),
    publishableKey: map["store.stripe.publishable_key"] || "",
    secretKey: map["store.stripe.secret_key"] || "",
    webhookSecret: map["store.stripe.webhook_secret"] || "",
  };
}

export async function getStripe(): Promise<Stripe> {
  const cfg = await getStripeConfig();
  if (!cfg.secretKey) {
    throw new Error("Stripe secret key non configurata. Vai su /admin/store/settings.");
  }
  if (_stripeInstance && _cachedSecretKey === cfg.secretKey) return _stripeInstance;
  _stripeInstance = new Stripe(cfg.secretKey, { apiVersion: "2025-02-24.acacia" });
  _cachedSecretKey = cfg.secretKey;
  return _stripeInstance;
}

export interface StoreGeneralConfig {
  currency: string;
  taxRateBp: number;
  defaultCountry: string;
  deliveryLeadTime: string;
}

export async function getStoreGeneralConfig(): Promise<StoreGeneralConfig> {
  const map = await loadSettings([
    "store.currency",
    "store.tax_rate_bp",
    "store.default_country",
    "store.delivery_lead_time",
  ]);
  return {
    currency: (map["store.currency"] || "EUR").toUpperCase(),
    taxRateBp: parseInt(map["store.tax_rate_bp"] || "2200", 10) || 2200,
    defaultCountry: (map["store.default_country"] || "IT").toUpperCase(),
    deliveryLeadTime: (map["store.delivery_lead_time"] || "4–6 settimane").trim() || "4–6 settimane",
  };
}
