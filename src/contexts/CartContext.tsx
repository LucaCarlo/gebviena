"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fbTrack } from "@/lib/fbpixel";

export interface CartItem {
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string | null;
  variantAttributes: string;
  sku: string;
  priceCents: number;
  quantity: number;
  coverImage: string | null;
  volumeM3: number;
  weightKg: number | null;
  shippingClass: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const STORAGE_KEY = "gtv_cart_v1";
const SESSION_KEY = "gtv_cart_session_v1";
const CartContext = createContext<CartContextValue | null>(null);

function generateSessionId(): string {
  const r = () => Math.floor(Math.random() * 16).toString(16);
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += r();
    if (i === 7 || i === 11 || i === 15 || i === 19) id += "-";
  }
  return id;
}

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 16) return existing;
    const fresh = generateSessionId();
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return generateSessionId();
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* quota exceeded — accettabile, in-memory continua */ }
  }, [items, hydrated]);

  // Sync DB Cart (debounce 1.2s) — per "carrelli abbandonati".
  useEffect(() => {
    if (!hydrated) return;
    const sessionId = getOrCreateSessionId();
    const subtotalCents = items.reduce((acc, i) => acc + i.priceCents * i.quantity, 0);
    const language = (typeof document !== "undefined" ? document.documentElement.lang : "it") || "it";
    const t = setTimeout(() => {
      fetch("/api/store/public/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: items.map((i) => ({
            variantId: i.variantId,
            productSlug: i.productSlug,
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            priceCents: i.priceCents,
            coverImage: i.coverImage,
          })),
          subtotalCents,
          language,
        }),
        keepalive: true,
      }).catch(() => { /* silent */ });
    }, 1200);
    return () => clearTimeout(t);
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty: number = 1) => {
    // eventID univoco per questa AddToCart: lo stesso passa a pixel client e
    // CAPI server-side per la deduplicazione Meta.
    const eventID = `atc-${item.variantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const value = (item.priceCents * qty) / 100;
    fbTrack("AddToCart", {
      content_ids: [item.variantId],
      content_name: item.productName,
      content_type: "product",
      value,
      currency: "EUR",
    }, eventID);
    // CAPI server gemello — fire-and-forget.
    if (typeof window !== "undefined") {
      fetch("/api/store/public/track/add-to-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventID,
          variantId: item.variantId,
          productName: item.productName,
          value,
          currency: "EUR",
          num_items: qty,
          eventSourceUrl: window.location.href,
        }),
        keepalive: true,
      }).catch(() => { /* silent */ });
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    count,
    subtotalCents,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    isOpen,
    setOpen,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
