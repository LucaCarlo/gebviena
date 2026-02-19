"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // TODO: implement search
      onClose();
    }
  };

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

          {/* Panel from right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[70] bg-white flex flex-col"
            style={{ width: "28vw", minWidth: "320px" }}
          >
            {/* Close button */}
            <div className="flex justify-end px-8 pt-6 pb-2">
              <button
                onClick={onClose}
                className="p-1 text-black hover:opacity-60 transition-opacity"
                aria-label="Chiudi ricerca"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* Search content */}
            <div className="px-8 md:px-10 pt-6">
              <p className="text-sm font-light mb-4" style={{ color: "#555" }}>
                Che cosa stai cercando?
              </p>

              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Scrivi qui la tua chiave di ricerca"
                  className="w-full border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                  style={{ color: "#000" }}
                  autoFocus
                />

                <button
                  type="submit"
                  className="mt-6 text-sm font-medium uppercase tracking-[0.1em] hover:opacity-60 transition-opacity"
                  style={{ color: "#000" }}
                >
                  Avvia la ricerca
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
