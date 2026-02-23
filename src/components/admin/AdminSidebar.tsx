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
  ImageIcon,
  UserCog,
  Mail,
  BarChart3,
  LogOut,
  ExternalLink,
  Settings,
  ChevronDown,
  Newspaper,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
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
      {
        href: "/admin/products",
        label: "Prodotti",
        icon: Package,
        children: [
          { href: "/admin/products", label: "Tutti i prodotti" },
          { href: "/admin/taxonomy/products/typologies", label: "Tipologie" },
          { href: "/admin/taxonomy/products/categories", label: "Categorie" },
        ],
      },
      { href: "/admin/designers", label: "Designer", icon: Palette },
      {
        href: "/admin/projects",
        label: "Progetti",
        icon: FolderOpen,
        children: [
          { href: "/admin/projects", label: "Tutti i progetti" },
          { href: "/admin/taxonomy/projects/categories", label: "Categorie" },
        ],
      },
      {
        href: "/admin/campaigns",
        label: "Campagne",
        icon: Megaphone,
        children: [
          { href: "/admin/campaigns", label: "Tutte le campagne" },
          { href: "/admin/taxonomy/campaigns/categories", label: "Categorie" },
        ],
      },
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
    label: "Clienti",
    items: [
      { href: "/admin/newsletter", label: "Newsletter", icon: Newspaper },
      { href: "/admin/contacts", label: "Messaggi", icon: Mail },
    ],
  },
  {
    label: "Configurazione",
    items: [
      { href: "/admin/hero", label: "Hero Slides", icon: LucideImage },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/users", label: "Utenti", icon: UserCog },
      { href: "/admin/analytics", label: "Analisi Traffico", icon: BarChart3 },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Amministratore",
  editor: "Editor",
  viewer: "Visualizzatore",
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [roleLabel, setRoleLabel] = useState("Admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.role) {
          setRoleLabel(ROLE_LABELS[data.data.role] || data.data.role);
        }
      })
      .catch(() => {});
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some((c) => isActive(c.href));
    }
    return false;
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-warm-700 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/logo.webp" alt="GTV" width={40} height={33} className="invert" />
          <span className="text-sm font-semibold tracking-wider uppercase">{roleLabel}</span>
        </Link>
        {/* Close button — only on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-warm-400 hover:text-white transition-colors"
          aria-label="Chiudi menu"
        >
          <X size={20} />
        </button>
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
                  {item.children ? (
                    <>
                      <button
                        onClick={() => toggleExpand(item.href)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors w-full",
                          isParentActive(item)
                            ? "bg-white/10 text-white"
                            : "text-warm-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <item.icon size={18} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            "transition-transform",
                            (expanded[item.href] || isParentActive(item)) && "rotate-180"
                          )}
                        />
                      </button>
                      {(expanded[item.href] || isParentActive(item)) && (
                        <ul className="ml-7 mt-0.5 space-y-0.5 border-l border-warm-700 pl-3">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "block px-3 py-1.5 rounded text-xs transition-colors",
                                  isActive(child.href)
                                    ? "text-white bg-white/10"
                                    : "text-warm-400 hover:text-white hover:bg-white/5"
                                )}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
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
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-warm-700 space-y-0.5">
        <Link
          href="/admin/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm transition-colors",
            isActive("/admin/settings")
              ? "bg-white/10 text-white"
              : "text-warm-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings size={18} />
          Impostazioni
        </Link>
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-warm-900 text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-warm-400 hover:text-white transition-colors"
          aria-label="Apri menu"
        >
          <Menu size={24} />
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.webp" alt="GTV" width={32} height={26} className="invert" />
          <span className="text-xs font-semibold tracking-wider uppercase">{roleLabel}</span>
        </Link>
        <div className="w-10" />
      </div>

      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-64 bg-warm-900 text-white min-h-screen flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-warm-900 text-white flex flex-col overflow-y-auto">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
