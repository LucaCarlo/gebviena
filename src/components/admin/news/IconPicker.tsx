"use client";

import { useState, useMemo } from "react";
import {
  X, Search,
  // Navigazione / link
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ChevronRight, ChevronLeft,
  Link as LinkIcon, ExternalLink,
  // Azioni / download
  Download, Upload, Share2, Send, Mail, Phone, MessageCircle, MessageSquare,
  Plus, Minus, Check, X as XIcon, Save, Edit, Trash2,
  // Commerce
  ShoppingBag, ShoppingCart, Tag, CreditCard, Gift, Percent, Heart, Star, Bookmark,
  // Media
  Image as ImageIcon, Camera, Video, Play, Pause, Film, Music,
  // Documenti
  FileText, File, Folder, FileDown, FileImage, FilePlus,
  // Utenti
  User, Users, UserPlus, UserCheck, LogIn, LogOut,
  // Info / aiuto
  Info, AlertCircle, HelpCircle, Lightbulb, Award, Sparkles, Crown,
  // Social
  Facebook, Instagram, Twitter, Linkedin, Youtube, Github,
  // Posizioni / mappe
  MapPin, Map, Globe, Home, Building,
  // Tempo
  Clock, Calendar, CalendarDays,
  // Settings
  Settings, Sliders, Filter, Search as SearchIcon, Eye, EyeOff, Lock, Unlock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Libreria curata di ~70 icone organizzate per categoria. I name sono
// stringhe stabili: vengono salvati in DB (es. NewsCta.iconName) e mappati
// qui al componente lucide-react corrispondente.
export const ICON_LIBRARY: Record<string, LucideIcon> = {
  // Navigazione
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ChevronRight, ChevronLeft,
  Link: LinkIcon, ExternalLink,
  // Azioni
  Download, Upload, Share2, Send, Mail, Phone, MessageCircle, MessageSquare,
  Plus, Minus, Check, X: XIcon, Save, Edit, Trash2,
  // Commerce
  ShoppingBag, ShoppingCart, Tag, CreditCard, Gift, Percent, Heart, Star, Bookmark,
  // Media
  Image: ImageIcon, Camera, Video, Play, Pause, Film, Music,
  // Documenti
  FileText, File, Folder, FileDown, FileImage, FilePlus,
  // Utenti
  User, Users, UserPlus, UserCheck, LogIn, LogOut,
  // Info / aiuto
  Info, AlertCircle, HelpCircle, Lightbulb, Award, Sparkles, Crown,
  // Social
  Facebook, Instagram, Twitter, Linkedin, Youtube, Github,
  // Posizioni
  MapPin, Map, Globe, Home, Building,
  // Tempo
  Clock, Calendar, CalendarDays,
  // Settings
  Settings, Sliders, Filter, SearchIcon, Eye, EyeOff, Lock, Unlock,
};

const CATEGORIES: { label: string; icons: string[] }[] = [
  { label: "Navigazione", icons: ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ArrowUpRight", "ChevronRight", "ChevronLeft", "Link", "ExternalLink"] },
  { label: "Azioni", icons: ["Download", "Upload", "Share2", "Send", "Mail", "Phone", "MessageCircle", "MessageSquare", "Plus", "Minus", "Check", "X", "Save", "Edit", "Trash2"] },
  { label: "Commerce", icons: ["ShoppingBag", "ShoppingCart", "Tag", "CreditCard", "Gift", "Percent", "Heart", "Star", "Bookmark"] },
  { label: "Media", icons: ["Image", "Camera", "Video", "Play", "Pause", "Film", "Music"] },
  { label: "Documenti", icons: ["FileText", "File", "Folder", "FileDown", "FileImage", "FilePlus"] },
  { label: "Utenti", icons: ["User", "Users", "UserPlus", "UserCheck", "LogIn", "LogOut"] },
  { label: "Info", icons: ["Info", "AlertCircle", "HelpCircle", "Lightbulb", "Award", "Sparkles", "Crown"] },
  { label: "Social", icons: ["Facebook", "Instagram", "Twitter", "Linkedin", "Youtube", "Github"] },
  { label: "Mappa", icons: ["MapPin", "Map", "Globe", "Home", "Building"] },
  { label: "Tempo", icons: ["Clock", "Calendar", "CalendarDays"] },
  { label: "Settings", icons: ["Settings", "Sliders", "Filter", "SearchIcon", "Eye", "EyeOff", "Lock", "Unlock"] },
];

interface Props {
  value?: string;
  onChange: (name: string | undefined) => void;
  trigger?: React.ReactNode;
}

/** Modal picker per la libreria icone. Click su un'icona la seleziona e
 *  chiude il modal. "Rimuovi" pulisce la selezione. */
export default function IconPicker({ value, onChange, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      ...c,
      icons: c.icons.filter((n) => n.toLowerCase().includes(q)),
    })).filter((c) => c.icons.length > 0);
  }, [search]);

  const SelectedIcon = value ? ICON_LIBRARY[value] : null;

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}>
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-warm-300 rounded text-xs bg-white hover:bg-warm-50 hover:border-warm-500"
        >
          {SelectedIcon ? <SelectedIcon size={14} /> : <Search size={12} />}
          {value ? value : "Scegli icona"}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-warm-200 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-4 pb-3 border-b border-warm-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-warm-800">Scegli icona</h3>
                {value && (
                  <button
                    type="button"
                    onClick={() => { onChange(undefined); setOpen(false); }}
                    className="text-[11px] text-warm-500 hover:text-warm-800 underline"
                  >
                    Rimuovi icona
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="ml-auto p-1.5 rounded hover:bg-warm-100 text-warm-500"><X size={16} /></button>
              </div>
              <div className="relative mt-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  type="search"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca per nome…"
                  className="w-full border border-warm-300 rounded pl-9 pr-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4 flex-1 space-y-5">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-warm-400 text-sm">Nessuna icona trovata.</div>
              ) : (
                filtered.map((cat) => (
                  <div key={cat.label}>
                    <div className="text-[10px] uppercase tracking-wider text-warm-500 font-semibold mb-2">{cat.label}</div>
                    <div className="grid grid-cols-6 md:grid-cols-10 gap-1.5">
                      {cat.icons.map((name) => {
                        const Icon = ICON_LIBRARY[name];
                        if (!Icon) return null;
                        const isSelected = value === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => { onChange(name); setOpen(false); }}
                            className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded border transition-colors ${
                              isSelected
                                ? "border-warm-900 bg-warm-100 text-warm-900"
                                : "border-warm-200 bg-white text-warm-600 hover:border-warm-400 hover:bg-warm-50"
                            }`}
                            title={name}
                          >
                            <Icon size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
