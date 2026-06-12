"use client";

import { useState } from "react";

export default function LogoutButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/professionals/logout", { method: "POST" });
    } catch { /* */ }
    window.location.href = "/";
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-block text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
