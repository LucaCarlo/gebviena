"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
      setEmail("");
    } catch {
      // silently fail
    }
  };

  return (
    <footer className="bg-white">
      {/* Newsletter section — horizontal layout */}
      <div className="border-t border-black mt-16">
        <div className="gtv-container py-14 md:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <div>
              <h3 className="font-sans text-lg md:text-xl lg:text-2xl font-normal uppercase tracking-wide" style={{ color: "#000" }}>
                Per gli amanti del design
              </h3>
              <p className="text-sm font-normal mt-2" style={{ color: "#757f80" }}>
                Ricevi novità e ispirazioni in esclusiva.
              </p>
            </div>
            <div>
              {subscribed ? (
                <p className="text-sm" style={{ color: "#eb5b27" }}>Grazie per l&apos;iscrizione!</p>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <label className="block text-xs font-normal mb-2" style={{ color: "#757f80" }}>
                    Il tuo indirizzo email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="esempio@gmail.com"
                    className="w-full border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                    style={{ color: "#000" }}
                    required
                  />
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px w-full bg-black" />

      {/* Logo */}
      <div className="gtv-container pt-14 md:pt-18">
        <Logo width={70} height={58} />
      </div>

      {/* Main footer content */}
      <div className="gtv-container pt-10 pb-14 md:pb-18">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Company info — spans 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-5 text-[13px] font-normal leading-relaxed" style={{ color: "#555" }}>
              <div>
                <p className="font-medium" style={{ color: "#000" }}>
                  Headquarters Gebrüder Thonet Vienna GmbH
                </p>
                <p>Via Foggia 23H – 10125 Torino (Italy)</p>
                <p>T. +39 0110133330</p>
                <Link href="mailto:info@gebruederthonetvienna.com" className="underline hover:no-underline">
                  info@gebruederthonetvienna.com
                </Link>
              </div>

              <div>
                <p className="font-medium" style={{ color: "#000" }}>
                  Registered Office Gebrüder Thonet Vienna GmbH
                </p>
                <p>Prinz Eugen Strasse 42 1040 Wien Österreich</p>
              </div>

              <div>
                <p className="font-medium" style={{ color: "#000" }}>
                  Offices of the trademarks licencee
                </p>
                <p>Production Furniture International S.p.A</p>
                <p>Via Vincenzo Vela 35/B – 10128 Torino (Italy)</p>
                <p>Codice Fiscale: 08743760012 – REA: TO-997261</p>
              </div>
            </div>

            {/* Language selector */}
            <div className="pt-4">
              <div className="inline-flex items-center border border-neutral-300 px-4 py-2.5 text-sm" style={{ color: "#000" }}>
                <span>Italiano</span>
                <svg className="ml-8 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Esplora — 2 cols */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-medium uppercase tracking-[0.12em] mb-8" style={{ color: "#000" }}>
              Esplora
            </h4>
            <ul className="space-y-5">
              <li>
                <Link href="/prodotti" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Prodotti
                </Link>
              </li>
              <li>
                <Link href="/progetti" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Progetti
                </Link>
              </li>
              <li>
                <Link href="/mondo-gtv" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Mondo GTV
                </Link>
              </li>
              <li>
                <Link href="/professionisti" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Professionisti
                </Link>
              </li>
              <li>
                <Link href="/contatti" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Contatti
                </Link>
              </li>
            </ul>
          </div>

          {/* Informati — 2 cols */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-medium uppercase tracking-[0.12em] mb-8" style={{ color: "#000" }}>
              Informati
            </h4>
            <ul className="space-y-5">
              <li>
                <Link href="/privacy-policy" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/condizioni-vendita" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity leading-snug" style={{ color: "#000" }}>
                  Condizioni Generali<br />di Vendita
                </Link>
              </li>
            </ul>
          </div>

          {/* Seguici — 3 cols */}
          <div className="lg:col-span-3">
            <h4 className="text-sm font-medium uppercase tracking-[0.12em] mb-8" style={{ color: "#000" }}>
              Seguici
            </h4>
            <ul className="space-y-5">
              <li>
                <Link href="https://facebook.com" target="_blank" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Facebook
                </Link>
              </li>
              <li>
                <Link href="https://instagram.com" target="_blank" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Instagram
                </Link>
              </li>
              <li>
                <Link href="https://pinterest.com" target="_blank" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  Pinterest
                </Link>
              </li>
              <li>
                <Link href="https://linkedin.com" target="_blank" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  LinkedIn
                </Link>
              </li>
              <li>
                <Link href="https://youtube.com" target="_blank" className="text-sm uppercase tracking-[0.08em] font-normal hover:opacity-60 transition-opacity" style={{ color: "#000" }}>
                  YouTube
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="gtv-container pb-8 pt-16 md:pt-24">
        <p className="text-[11px] font-normal leading-relaxed" style={{ color: "#555" }}>
          Copyright 2025 © GEBRUDER THONET VIENNA GMBH
        </p>
        <p className="text-[11px] font-normal leading-[1.8] mt-3 max-w-3xl" style={{ color: "#555" }}>
          Si prega di osservare che l&apos;utilizzo del marchio e il nome della società &ldquo;Gebrüder Thonet Vienna&rdquo; negli
          Stati Uniti e l&apos;uso del marchio di fabbrica &ldquo;Gebrüder Thonet Vienna&rdquo; in Germania comporta restrizioni,
          a causa di accordi stipulati con altre imprese. Per ulteriori informazioni si prega di contattare info@gebruederthonetvienna.it.
        </p>
      </div>
    </footer>
  );
}
