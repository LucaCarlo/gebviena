"use client";

import { useEffect, useState } from "react";

interface Props {
  title: string;
  message: string;
  openingDate: string | null; // ISO YYYY-MM-DD or empty
  mainSiteUrl: string; // absolute URL of the main GTV site (no /store)
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function computeCountdown(target: Date): Countdown {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: false };
}

const ITALIAN_MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function formatItalianDate(iso: string): string {
  const hasTime = iso.includes("T");
  const d = new Date(hasTime ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const base = `${d.getDate()} ${ITALIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (hasTime && !(d.getHours() === 0 && d.getMinutes() === 0)) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${base} · ${hh}:${mm}`;
  }
  return base;
}

export default function MaintenanceScreen({ title, message, openingDate, mainSiteUrl }: Props) {
  const baseUrl = mainSiteUrl.replace(/\/$/, "");
  // openingDate può essere "YYYY-MM-DD" (vecchio formato) o
  // "YYYY-MM-DDTHH:mm" (nuovo, con ora). Gestiamo entrambi.
  const target = openingDate
    ? new Date(openingDate.includes("T") ? openingDate : openingDate + "T00:00:00")
    : null;
  const [cd, setCd] = useState<Countdown | null>(target ? computeCountdown(target) : null);

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setCd(computeCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-dark font-sans">
      <header className="px-6 md:px-10 py-6 md:py-8">
        <a href={baseUrl + "/"} className="text-[13px] md:text-[14px] font-medium tracking-[0.18em] uppercase text-dark hover:opacity-70 transition-opacity">
          Gebr&uuml;der Thonet Vienna
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[720px] w-full text-center">
          <p className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.22em] text-warm-600 mb-6">
            Store online
          </p>

          <h1 className="text-[40px] md:text-[60px] lg:text-[72px] font-semibold leading-[1.05] text-dark mb-7 tracking-[-0.02em]">
            {title || "Stiamo arrivando"}
          </h1>

          {message && (
            <p className="text-[15px] md:text-[17px] text-warm-700 leading-[1.65] mb-12 max-w-[560px] mx-auto whitespace-pre-line">
              {message}
            </p>
          )}

          {target && cd && !cd.done && (
            <>
              <div className="flex items-center justify-center gap-3 md:gap-6 mb-6">
                <CountdownCell value={cd.days} label="Giorni" />
                <Separator />
                <CountdownCell value={cd.hours} label="Ore" />
                <Separator />
                <CountdownCell value={cd.minutes} label="Minuti" />
                <Separator />
                <CountdownCell value={cd.seconds} label="Secondi" />
              </div>
              <p className="text-[12px] md:text-[13px] text-warm-500 tracking-wider uppercase">
                Apertura prevista: <strong className="text-dark">{formatItalianDate(openingDate!)}</strong>
              </p>
            </>
          )}

          {target && cd?.done && (
            <p className="text-[14px] text-warm-600">
              Lo store sta tornando online. Ricarica la pagina tra qualche minuto.
            </p>
          )}

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] tracking-[0.16em] uppercase text-warm-600">
            <a href={baseUrl + "/"} className="hover:text-dark transition-colors">Sito principale</a>
            <span className="text-warm-300">·</span>
            <a href={baseUrl + "/contatti/richiesta-info"} className="hover:text-dark transition-colors">Contatti</a>
            <span className="text-warm-300">·</span>
            <a href={baseUrl + "/prodotti"} className="hover:text-dark transition-colors">Catalogo prodotti</a>
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 text-center text-[11px] text-warm-500 tracking-wider">
        © Gebr&uuml;der Thonet Vienna
      </footer>
    </div>
  );
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
      <span className="text-[36px] md:text-[56px] font-semibold text-dark leading-none tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-warm-500 mt-2">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return <span className="text-[28px] md:text-[44px] text-warm-300 leading-none">:</span>;
}
