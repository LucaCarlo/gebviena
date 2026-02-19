"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  Palette,
  FolderOpen,
  Megaphone,
  Trophy,
  Store,
  Users,
  Image as LucideImage,
  Layers,
  Globe,
  ImageIcon,
  UserCog,
  Mail,
  BarChart3,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Contenuti",
    items: [
      { href: "/admin/products", label: "Prodotti", icon: Package },
      { href: "/admin/designers", label: "Designer", icon: Palette },
      { href: "/admin/projects", label: "Progetti", icon: FolderOpen },
      { href: "/admin/campaigns", label: "Campagne", icon: Megaphone },
      { href: "/admin/awards", label: "Premi", icon: Trophy },
    ],
  },
  {
    label: "Negozio",
    items: [
      { href: "/admin/stores", label: "Negozi", icon: Store },
      { href: "/admin/agents", label: "Agenti", icon: Users },
    ],
  },
  {
    label: "Configurazione",
    items: [
      { href: "/admin/hero", label: "Hero Slides", icon: LucideImage },
      { href: "/admin/finishes", label: "Finiture", icon: Layers },
      { href: "/admin/languages", label: "Lingue", icon: Globe },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/users", label: "Utenti", icon: UserCog },
      { href: "/admin/contacts", label: "Messaggi", icon: Mail },
      { href: "/admin/analytics", label: "Analisi Traffico", icon: BarChart3 },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="w-64 bg-warm-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-warm-700">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/logo.webp" alt="GTV" width={40} height={33} className="invert" />
          <span className="text-sm font-semibold tracking-wider">ADMIN</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? "mt-4" : ""}>
            {section.label && (
              <div className="px-6 mb-2">
                <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-widest">
                  {section.label}
                </span>
              </div>
            )}
            <ul className="space-y-0.5 px-3">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-white/10 text-white"
                        : "text-warm-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-warm-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-warm-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          Esci
        </button>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2 mt-1 text-xs text-warm-500 hover:text-warm-300 transition-colors"
        >
          <ExternalLink size={14} />
          Torna al sito
        </Link>
      </div>
    </aside>
  );
}
