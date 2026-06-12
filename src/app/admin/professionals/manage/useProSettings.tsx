"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook condiviso dalle tab Impostazioni: legge tutti i Setting del gruppo
 * "professionals" e fornisce un saver che fa PATCH parziale.
 */
export function useProSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/professionals-settings", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setValues(j.data || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (patch: Record<string, string>) => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/professionals-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (j.success) {
        setValues((prev) => ({ ...prev, ...patch }));
        setToast("Impostazioni salvate ✓");
        setTimeout(() => setToast(null), 2500);
      } else {
        setToast(j.error || "Errore");
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast("Errore di connessione");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }, []);

  return { values, loading, saving, toast, save, reload };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-warm-900 text-white text-sm px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
}
