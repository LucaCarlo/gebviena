"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import SearchPanel from "./SearchPanel";

export default function Header() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const heroEndRef = useRef(0);

  useEffect(() => {
    if (!isHomepage) {
      setIsScrolled(true);
      return;
    }

    // Find the hero section height to know when to switch
    const heroSection = document.querySelector("main > section:first-child");
    if (heroSection) {
      heroEndRef.current = heroSection.getBoundingClientRect().height;
    }

    // Reset state based on current scroll position (fixes back-navigation bug)
    setIsScrolled(window.scrollY > heroEndRef.current * 0.7);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > heroEndRef.current * 0.7);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomepage]);

  return (
    <>
      <header
        className={`fixed top-0 z-50 ${
          isScrolled
            ? "bg-white shadow-[0_1px_8px_rgba(0,0,0,0.08)]"
            : ""
        }`}
        style={{
          left: 'var(--site-margin)',
          right: 'var(--site-margin)',
          transition: "background 0.6s ease",
          ...(!isScrolled ? { background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 60%, transparent 100%)" } : {}),
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

            {/* Search right — flipped */}
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
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
