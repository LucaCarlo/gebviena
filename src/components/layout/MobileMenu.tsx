"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { NAV_ITEMS } from "@/lib/constants";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Reset submenu when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActiveItem(null);
    }
  }, [isOpen]);

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
            onClick={onClose}
          />

          {/* Panel — width expands when subcategories are open */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 left-0 bottom-0 z-[70] bg-white flex transition-[width] duration-300 ease-in-out"
            style={{ width: hasSubOpen ? "66vw" : "33vw", maxWidth: hasSubOpen ? "1000px" : "500px", minWidth: "320px" }}
          >
            {/* Left column — close button + nav + image */}
            <div className={`flex flex-col transition-all duration-300 ${hasSubOpen ? "w-1/2" : "w-full"}`}>
              {/* Close */}
              <div className="px-8 pt-6 pb-2">
                <button
                  onClick={onClose}
                  className="p-1 text-dark hover:opacity-60 transition-opacity"
                  aria-label="Chiudi menu"
                >
                  <X size={22} strokeWidth={1.5} />
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
                            className={`font-sans text-lg md:text-xl lg:text-2xl uppercase tracking-wider font-light text-dark transition-all hover:underline hover:underline-offset-[10px] hover:decoration-[1px] ${
                              isActive ? "underline underline-offset-[10px] decoration-[1px]" : ""
                            }`}
                          >
                            {item.label}
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="font-sans text-lg md:text-xl lg:text-2xl uppercase tracking-wider font-light text-dark transition-all hover:underline hover:underline-offset-[10px] hover:decoration-[1px]"
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Featured image */}
              <div className="relative overflow-hidden mb-auto" style={{ width: "calc(100% - 80px)", height: "35vh", margin: "0 auto 40px auto" }}>
                <Image
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=600&fit=crop&q=80"
                  alt="Interno Marche"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-white text-base md:text-lg font-light uppercase tracking-[0.15em] leading-snug">
                    Interno Marche | Scopri il nostro flagship hotel
                  </p>
                </div>
              </div>
            </div>

            {/* Right column — subcategories, border goes full height */}
            <AnimatePresence>
              {hasSubOpen && activeNav && "children" in activeNav && activeNav.children && (
                <motion.div
                  initial={{ opacity: 0, x: "100%" }}
                  animate={{ opacity: 1, x: 0, transition: { type: "tween", duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } }}
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                  className="flex items-start pt-32 overflow-hidden w-1/2"
                  style={{ borderLeft: "1px solid #000", paddingLeft: "15%" }}
                >
                  <AnimatePresence mode="wait">
                    <motion.ul
                      key={activeItem}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                      className="space-y-6 md:space-y-7"
                    >
                      {activeNav.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={onClose}
                            className="block font-sans text-sm md:text-base uppercase tracking-wider font-light transition-all hover:underline hover:underline-offset-[8px] hover:decoration-[1px] whitespace-nowrap"
                            style={{ color: "#000000" }}
                          >
                            {child.label}
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
