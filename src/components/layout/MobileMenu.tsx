"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { NAV_ITEMS } from "@/lib/constants";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FEATURED_IMAGE = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=600&fit=crop&q=80";

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useT();
  const lang = useLang();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [featuredImage, setFeaturedImage] = useState<string>(DEFAULT_FEATURED_IMAGE);

  // Reset submenu when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActiveItem(null);
    }
  }, [isOpen]);

  // Load featured image from page-images
  useEffect(() => {
    fetch("/api/page-images?page=menu")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const img = (data.data || []).find((i: { section: string; imageUrl: string }) => i.section === "featured");
          if (img?.imageUrl) setFeaturedImage(img.imageUrl);
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleItemClick = (label: string, hasChildren: boolean) => {
    if (hasChildren) {
      setActiveItem(activeItem === label ? null : label);
    }
  };

  const activeNav = NAV_ITEMS.find(
    (item) => "children" in item && item.label === activeItem
  );
  const hasSubOpen = !!(activeItem && activeNav && "children" in activeNav && activeNav.children);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60]"
            onClick={onClose}
          />

          {/* Wrapper — contains both columns, slides in as one unit */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 left-0 bottom-0 z-[70] flex"
          >
            {/* Left column — FIXED width, never changes */}
            <div
              className="bg-white flex flex-col shrink-0 relative z-10"
              style={{ width: "32vw", minWidth: "310px", maxWidth: "485px" }}
            >
              {/* Close */}
              <div className="px-8 pt-6 pb-2">
                <button
                  onClick={onClose}
                  className="p-1 text-dark hover:opacity-60 transition-opacity"
                  aria-label="Chiudi menu"
                >
                  <X size={22} strokeWidth={2} />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 flex items-start justify-center pt-14">
                <ul className="space-y-10 md:space-y-12">
                  {NAV_ITEMS.map((item) => {
                    const hasChildren = "children" in item && !!item.children;
                    const isActive = activeItem === item.label;

                    return (
                      <li key={item.label}>
                        {hasChildren ? (
                          <button
                            onClick={() => handleItemClick(item.label, true)}
                            className={`font-sans text-lg md:text-xl lg:text-2xl uppercase tracking-wider font-light text-dark transition-all hover:underline hover:underline-offset-[10px] hover:decoration-[0.5px] ${
                              isActive ? "underline underline-offset-[10px] decoration-[0.5px]" : ""
                            }`}
                          >
                            {t(item.i18nKey)}
                          </button>
                        ) : (
                          <Link
                            href={localizePath(item.href, lang)}
                            onClick={onClose}
                            className="font-sans text-lg md:text-xl lg:text-2xl uppercase tracking-wider font-light text-dark transition-all hover:underline hover:underline-offset-[10px] hover:decoration-[0.5px]"
                          >
                            {t(item.i18nKey)}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Featured image — links to GTV Experience */}
              <Link
                href={localizePath("/mondo-gtv/gtv-experience", lang)}
                onClick={onClose}
                className="relative overflow-hidden mb-auto block group"
                style={{ width: "calc(100% - 60px)", aspectRatio: "1 / 0.85", margin: "60px 30px 30px 30px" }}
              >
                <Image
                  src={featuredImage}
                  alt="Interno Marche"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-3 right-3">
                  <p className="text-white text-[20px] font-light uppercase tracking-[0.03em] leading-snug">
                    Interno Marche | Scopri il nostro flagship hotel
                  </p>
                </div>
              </Link>
            </div>

            {/* Right column — same width as left, slides in from left */}
            <AnimatePresence>
              {hasSubOpen && activeNav && "children" in activeNav && activeNav.children && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white flex items-start pt-32 shrink-0 overflow-hidden"
                  style={{ borderLeft: "1px solid #000", paddingLeft: "15%", width: "32vw", minWidth: "310px", maxWidth: "485px" }}
                >
                  <AnimatePresence mode="wait">
                    <motion.ul
                      key={activeItem}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "tween", duration: 0.25, delay: 0.15 }}
                      className="space-y-6 md:space-y-7"
                    >
                      {activeNav.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={localizePath(child.href, lang)}
                            onClick={onClose}
                            className="block font-sans text-sm md:text-base uppercase tracking-wider font-light transition-all hover:underline hover:underline-offset-[8px] hover:decoration-[0.5px] whitespace-nowrap"
                            style={{ color: "#000000" }}
                          >
                            {t(child.i18nKey)}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
