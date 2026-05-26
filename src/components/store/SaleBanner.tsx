"use client";

import { useEffect, useState } from "react";
import { useStoreT } from "@/lib/use-store-t";

interface SaleConfig {
  enabled: boolean;
  endDate: string | null; // ISO date string
  messageIt: string;
  messageFr: string;
}

function diff(endMs: number, nowMs: number) {
  const ms = Math.max(0, endMs - nowMs);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, expired: ms <= 0 };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function SaleBanner() {
  const t = useStoreT();
  const [cfg, setCfg] = useState<SaleConfig | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    fetch("/api/store/public/sale-banner", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setCfg(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cfg?.enabled || !cfg.endDate) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cfg?.enabled, cfg?.endDate]);

  const endMs = cfg?.endDate ? new Date(cfg.endDate).getTime() : 0;
  const visible = !!(cfg?.enabled && endMs > 0 && now < endMs);

  // CSS var → permette a StoreHeader e <main> di scalarsi quando il banner è visibile
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--store-sale-banner-h", visible ? "40px" : "0px");
    return () => { root.style.setProperty("--store-sale-banner-h", "0px"); };
  }, [visible]);

  if (!visible) return null;

  const d = diff(endMs, now);
  const message = t(
    cfg!.messageIt || "Merce in svendita limitata",
    cfg!.messageFr || cfg!.messageIt || "Marchandise en vente limitée"
  );

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-black text-white"
      style={{ height: 40 }}
    >
      <div className="h-full flex items-center justify-center gap-3 md:gap-6 px-4 text-[11px] md:text-[12px] uppercase tracking-[0.15em] font-light">
        <span className="hidden sm:inline">{message}</span>
        <span className="sm:hidden">{message}</span>
        <span className="inline-flex items-center gap-1 md:gap-1.5 font-mono tracking-[0.08em] text-white/95">
          {d.days > 0 && (
            <>
              <span className="font-semibold">{d.days}</span>
              <span className="text-white/60">{t("g", "j")}</span>
              <span className="text-white/40 mx-0.5">·</span>
            </>
          )}
          <span className="font-semibold">{pad(d.hours)}</span>
          <span className="text-white/60">h</span>
          <span className="text-white/40 mx-0.5">·</span>
          <span className="font-semibold">{pad(d.minutes)}</span>
          <span className="text-white/60">m</span>
          <span className="text-white/40 mx-0.5">·</span>
          <span className="font-semibold">{pad(d.seconds)}</span>
          <span className="text-white/60">s</span>
        </span>
      </div>
    </div>
  );
}
