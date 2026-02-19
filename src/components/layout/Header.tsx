"use client";

import { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import SearchPanel from "./SearchPanel";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const heroEndRef = useRef(0);

  useEffect(() => {
    // Find the hero section height to know when to switch
    const heroSection = document.querySelector("main > section:first-child");
    if (heroSection) {
      heroEndRef.current = heroSection.getBoundingClientRect().height;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > heroEndRef.current - 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-white border-b border-neutral-200"
            : ""
        }`}
        style={{
          width: "85vw",
          left: "0",
          right: "0",
          marginLeft: "auto",
          marginRight: "auto",
          ...(!isScrolled ? { textShadow: "0 1px 8px rgba(0,0,0,0.3)" } : {}),
        }}
      >
        <div className="px-2 md:px-4 lg:px-5">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Hamburger left */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`p-1 transition-colors ${
                isScrolled ? "text-black" : "text-white drop-shadow-md"
              } hover:opacity-70`}
              aria-label="Apri menu"
            >
              <Menu size={32} strokeWidth={1.3} />
            </button>

            {/* Logo centered — switches between white and dark */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href="/">
                <Image
                  src={isScrolled ? "/logo.webp" : "/logo-white.svg"}
                  alt="Wiener GTV Design"
                  width={95}
                  height={78}
                  priority
                  className="transition-opacity duration-300"
                />
              </Link>
            </div>

            {/* Search right — flipped */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`p-1 transition-colors ${
                isScrolled ? "text-black" : "text-white drop-shadow-md"
              } hover:opacity-70`}
              aria-label="Cerca"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1)" }}>
                <circle cx="11" cy="11" r="8" />
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
