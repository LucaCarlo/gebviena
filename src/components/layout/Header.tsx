"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import SearchPanel from "./SearchPanel";
import HeaderLanguageSwitcher from "./HeaderLanguageSwitcher";
import { useT, useLang } from "@/contexts/I18nContext";

export default function Header() {
  const pathname = usePathname();
  const canonicalPath = pathname.replace(/^\/(en|de|fr)(?=\/|$)/, "") || "/";
  const isHomepage = canonicalPath === "/";
  const t = useT();
  const lang = useLang();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [proUnread, setProUnread] = useState(0);
  const proHref = lang === "it" ? "/area-professionisti/accesso" : `/${lang}/area-professionisti/accesso`;
  const heroEndRef = useRef(0);

  // Conteggio notifiche non lette per il professionista loggato.
  // L'endpoint risponde { unread: N } se loggato, { unread: 0 } se no — quindi
  // sicuro da chiamare anche su navigazione anonima (nessun 401 in console).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/area-professionisti/notifications/unread-count", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!cancelled && j?.success) setProUnread(Number(j.unread) || 0); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (!isHomepage) {
      setIsScrolled(true);
      return;
    }

    const measure = () => {
      const heroSection = document.querySelector("main > section:first-child");
      const h = heroSection?.getBoundingClientRect().height || 0;
      // Fallback while the hero image/video is still loading: assume the hero
      // covers most of the viewport. Otherwise the threshold becomes 0 and the
      // header turns white as soon as scrollY > 0.
      heroEndRef.current = h > 0 ? h : window.innerHeight * 0.9;
    };

    const update = () => {
      measure();
      setIsScrolled(window.scrollY > heroEndRef.current * 0.7);
    };

    update();
    // Re-measure once the hero (and its async image) has had a chance to layout.
    const raf = requestAnimationFrame(update);
    const onLoad = () => update();
    window.addEventListener("load", onLoad);
    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHomepage]);

  return (
    <>
      <header
        className={`fixed top-0 z-50 ${
          isScrolled
            ? "bg-white"
            : ""
        }`}
        style={{
          left: 'var(--site-margin)',
          right: 'var(--site-margin)',
          transition: "background 0.6s ease",
          ...(!isScrolled ? { background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.28) 60%, transparent 100%)" } : {}),
        }}
      >
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Hamburger left */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`-ml-0.5 p-1 transition-colors ${
                isScrolled ? "text-neutral-700" : "text-white"
              }`}
              aria-label="Apri menu"
            >
              <div className="flex flex-col justify-between" style={{ width: "27px", height: "19px" }}>
                <span className="block w-full bg-current" style={{ height: "3px" }} />
                <span className="block w-full bg-current" style={{ height: "3px" }} />
                <span className="block w-full bg-current" style={{ height: "3px" }} />
              </div>
            </button>

            {/* Logo centered — switches between white and dark */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href="/">
                <Image
                  src={isScrolled ? "/logo.webp" : "/logo-white.svg"}
                  alt="Wiener GTV Design"
                  width={97}
                  height={79}
                  style={{ marginTop: "-2px" }}
                  priority
                  className=""
                />
              </Link>
            </div>

            {/* Right — area professionisti + language + search */}
            <div className="flex items-center gap-4 md:gap-6">
              <Link
                href={proHref}
                className={`hidden md:inline-flex items-center gap-1.5 relative uppercase text-[14px] tracking-[0.03em] font-medium transition-colors hover:underline ${
                  isScrolled ? "!text-black" : "text-white"
                }`}
                style={{ textUnderlineOffset: "6px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
                aria-label={t("pro.header.link")}
              >
                {t("pro.header.link")}
                {proUnread > 0 && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-red-500"
                    style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.85)" }}
                    aria-label={`${proUnread} novità non lette`}
                    title={`${proUnread} ${proUnread === 1 ? "novità non letta" : "novità non lette"} in bacheca`}
                  />
                )}
              </Link>
              <HeaderLanguageSwitcher isScrolled={isScrolled} />
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`p-1 transition-colors ${
                  isScrolled ? "text-neutral-700" : "text-white"
                }`}
                aria-label="Cerca"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1) rotate(8deg)" }}>
                  <circle cx="11" cy="11" r="6.5" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
