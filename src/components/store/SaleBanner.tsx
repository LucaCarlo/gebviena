"use client";

import { useEffect, useState } from "react";
import { useStoreT } from "@/lib/use-store-t";

interface SaleConfig {
  enabled: boolean;
  endDate: string | null; // ISO date string
  messageIt: string;
  messageFr: string;
  countdownPrefixIt?: string;
  countdownPrefixFr?: string;
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

  // CSS var → permette a StoreHeader e <main> di scalarsi quando il banner è visibile.
  // Altezza maggiore (mobile 64px, desktop 56px) per migliore leggibilità.
  useEffect(() => {
    const root = document.documentElement;
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = visible ? (w < 768 ? "64px" : "56px") : "0px";
    root.style.setProperty("--store-sale-banner-h", h);
    return () => { root.style.setProperty("--store-sale-banner-h", "0px"); };
  }, [visible, now]);

  if (!visible) return null;

  const d = diff(endMs, now);
  const message = t(
    cfg!.messageIt || "Merce in svendita limitata",
    cfg!.messageFr || cfg!.messageIt || "Marchandise en vente limitée"
  );
  const closesIn = t(
    cfg!.countdownPrefixIt || "La vendita speciale si chiuderà tra:",
    cfg!.countdownPrefixFr || cfg!.countdownPrefixIt || "La vente spéciale se termine dans :"
  );

  return (
    <div
      className="fixed top-20 md:top-24 left-0 right-0 z-[45] bg-black text-white shadow-lg border-y border-amber-500/40"
      style={{ minHeight: 56 }}
    >
      <div className="h-full min-h-[56px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-5 px-4 py-1.5 md:py-2 text-center">
        <span className="text-[12px] md:text-sm uppercase tracking-[0.18em] font-medium text-amber-300">
          {message}
        </span>
        <span className="hidden md:inline text-amber-300/50">·</span>
        <span className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
          <span className="text-[11px] md:text-[13px] uppercase tracking-[0.12em] text-white/80">
            {closesIn}
          </span>
          <span className="inline-flex items-baseline gap-1 md:gap-1.5 font-mono tabular-nums text-base md:text-lg font-bold tracking-wide text-white">
            {d.days > 0 && (
              <>
                <span>{d.days}</span>
                <span className="text-[10px] md:text-xs font-normal text-white/70 uppercase mr-1">{t("g", "j")}</span>
              </>
            )}
            <span>{pad(d.hours)}</span>
            <span className="text-[10px] md:text-xs font-normal text-white/70 uppercase mr-1">h</span>
            <span>{pad(d.minutes)}</span>
            <span className="text-[10px] md:text-xs font-normal text-white/70 uppercase mr-1">m</span>
            <span>{pad(d.seconds)}</span>
            <span className="text-[10px] md:text-xs font-normal text-white/70 uppercase">s</span>
          </span>
        </span>
      </div>
    </div>
  );
}
