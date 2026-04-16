"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
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

  useEffect(() => {
    if (!isOpen) {
      setActiveItem(null);
    }
  }, [isOpen]);

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
            className="fixed inset-0 z-[60] bg-black/25"
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Wrapper */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 left-0 bottom-0 z-[70] flex"
            style={{ width: "min(100vw, 970px)", maxWidth: "100vw" }}
          >
            {/* Main column */}
            <div
              className="bg-white flex flex-col shrink-0 relative z-10 w-[86vw] max-w-[485px] md:w-[32vw] md:min-w-[310px]"
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
              <nav className="flex items-start justify-center pt-10 md:pt-14 flex-1 overflow-y-auto">
                <ul className="space-y-8 md:space-y-12">
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

              {/* Featured image — hidden on very small screens */}
              <Link
                href={localizePath("/mondo-gtv/gtv-experience", lang)}
                onClick={onClose}
                className="relative overflow-hidden hidden sm:block"
                style={{ width: "calc(100% - 60px)", aspectRatio: "1.3 / 1", margin: "40px 30px 30px 30px" }}
              >
                <Image
                  src={featuredImage}
                  alt="Interno Marche"
                  fill
                  className="object-cover"
                  sizes="485px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-3 right-3">
                  <p className="text-white text-[18px] md:text-[20px] font-light uppercase tracking-[0.03em] leading-snug">
                    {t("common.menu_featured")}
                  </p>
                </div>
              </Link>
            </div>

            {/* Submenu column — mobile: absolute overlay; desktop: inline to the right */}
            <AnimatePresence>
              {hasSubOpen && activeNav && "children" in activeNav && activeNav.children && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white shrink-0 overflow-hidden absolute inset-0 z-20 md:static md:z-auto w-[86vw] max-w-[485px] md:w-[32vw] md:min-w-[310px] md:border-l md:border-black flex flex-col"
                >
                  {/* Back button — mobile only */}
                  <div className="md:hidden px-8 pt-6 pb-2">
                    <button
                      onClick={() => setActiveItem(null)}
                      className="p-1 text-dark hover:opacity-60 transition-opacity inline-flex items-center gap-2"
                      aria-label="Indietro"
                    >
                      <ArrowLeft size={22} strokeWidth={2} />
                      <span className="uppercase text-[14px] tracking-wider font-light">{t("common.back")}</span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.ul
                      key={activeItem}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "tween", duration: 0.25, delay: 0.15 }}
                      className="space-y-6 md:space-y-7 px-8 md:px-0 pt-10 md:pt-32 md:pl-[15%]"
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
