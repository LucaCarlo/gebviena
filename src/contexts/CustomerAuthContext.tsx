"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface StoreCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  language?: string;
  marketingOptIn?: boolean;
}

interface CustomerAuthCtx {
  customer: StoreCustomer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setCustomer: (c: StoreCustomer | null) => void;
}

const Ctx = createContext<CustomerAuthCtx>({
  customer: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  setCustomer: () => {},
});

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/store/public/auth/me", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setCustomer(j.data || null);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/store/public/auth/logout", { method: "POST" });
    setCustomer(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ customer, loading, refresh, logout, setCustomer }), [customer, loading, refresh, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerAuth() {
  return useContext(Ctx);
}
