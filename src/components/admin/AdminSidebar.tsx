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
  ImageIcon,
  UserCog,
  Mail,
  BarChart3,
  LogOut,
  ExternalLink,
  Settings,
  ChevronDown,
  Newspaper,
  FileDown,
  Images,
  Menu,
  X,
  PenLine,
  Shield,
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
  permission?: string; // e.g. "products.view" — hides item if user lacks this
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
        permission: "products.view",
        children: [
          { href: "/admin/products", label: "Tutti i prodotti" },
          { href: "/admin/taxonomy/products/typologies", label: "Tipologie" },
          { href: "/admin/taxonomy/products/categories", label: "Categorie" },
          { href: "/admin/products/dimensions", label: "Dimensioni" },
        ],
      },
      { href: "/admin/designers", label: "Designer", icon: Palette, permission: "designers.view" },
      {
        href: "/admin/projects",
        label: "Progetti",
        icon: FolderOpen,
        permission: "projects.view",
        children: [
          { href: "/admin/projects", label: "Tutti i progetti" },
          { href: "/admin/taxonomy/projects/categories", label: "Categorie" },
        ],
      },
      {
        href: "/admin/campaigns",
        label: "Campagne",
        icon: Megaphone,
        permission: "campaigns.view",
        children: [
          { href: "/admin/campaigns", label: "Tutte le campagne" },
          { href: "/admin/taxonomy/campaigns/categories", label: "Categorie" },
        ],
      },
      { href: "/admin/awards", label: "Premi", icon: Trophy, permission: "awards.view" },
      { href: "/admin/catalogs", label: "Cataloghi", icon: FileDown, permission: "catalogs.view" },
      {
        href: "/admin/news",
        label: "News",
        icon: Newspaper,
        permission: "news.view",
        children: [
          { href: "/admin/news", label: "Tutte le news" },
          { href: "/admin/taxonomy/news/categories", label: "Categorie" },
        ],
      },
    ],
  },
  {
    label: "Negozio",
    items: [
      { href: "/admin/stores", label: "Negozi", icon: Store, permission: "stores.view" },
      { href: "/admin/agents", label: "Agenti", icon: Users, permission: "agents.view" },
    ],
  },
  {
    label: "Clienti",
    items: [
      { href: "/admin/newsletter", label: "Newsletter", icon: Newspaper, permission: "newsletter.view" },
      { href: "/admin/contacts", label: "Messaggi", icon: Mail, permission: "contacts.view" },
      { href: "/admin/forms", label: "Forms", icon: Settings, permission: "forms.view" },
    ],
  },
  {
    label: "Configurazione",
    items: [
      { href: "/admin/gestione-immagini", label: "Gestione Immagini", icon: Images, permission: "hero.view" },
      { href: "/admin/media", label: "Media", icon: ImageIcon, permission: "media.view" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/users", label: "Utenti", icon: UserCog, permission: "users.view" },
      { href: "/admin/roles", label: "Ruoli", icon: Shield, permission: "roles.view" },
      { href: "/admin/analytics", label: "Analisi Traffico", icon: BarChart3, permission: "analytics.view" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/firma", label: "Firma Email", icon: PenLine, permission: "firma.view" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [roleLabel, setRoleLabel] = useState("Admin");
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setRoleLabel(data.data.roleLabel || data.data.role);
          setRoleName(data.data.role);
          if (data.data.permissions) setPermissions(data.data.permissions);
        }
      })
      .catch(() => {});
  }, []);

  const canView = (permKey?: string) => {
    if (!permKey) return true; // no permission required (e.g. Dashboard)
    if (roleName === "superadmin") return true;
    return permissions[permKey] === true;
  };

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

  /* ---- Shared pieces ---- */
  const logoBlock = (
    <div className="shrink-0 p-6 border-b border-warm-700/50 flex items-center justify-between">
      <Link href="/admin" className="flex items-center gap-3">
        <Image src="/logo.webp" alt="GTV" width={40} height={33} className="invert" />
        <span className="text-sm font-semibold tracking-wider uppercase">{roleLabel}</span>
      </Link>
      <button
        onClick={() => setMobileOpen(false)}
        className="lg:hidden p-1 text-warm-400 hover:text-white transition-colors"
        aria-label="Chiudi menu"
      >
        <X size={20} />
      </button>
    </div>
  );

  const navBlock = (
    <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden py-4">
      {navSections.map((section, sectionIndex) => {
        const visibleItems = section.items.filter((item) => canView(item.permission));
        if (visibleItems.length === 0) return null;
        return (
        <div key={sectionIndex} className={sectionIndex > 0 ? "mt-4" : ""}>
          {section.label && (
            <div className="px-6 mb-2">
              <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-widest">
                {section.label}
              </span>
            </div>
          )}
          <ul className="space-y-0.5 px-3">
            {visibleItems.map((item) => (
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
        );
      })}
    </nav>
  );

  const footerBlock = (
    <div className="shrink-0 px-4 py-3 border-t border-warm-700/50 flex items-center justify-center gap-2">
      <Link
        href="/admin/settings"
        title="Impostazioni"
        className={cn(
          "p-2.5 rounded-lg transition-colors",
          isActive("/admin/settings")
            ? "bg-white/10 text-white"
            : "text-warm-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Settings size={18} />
      </Link>
      <button
        onClick={handleLogout}
        title="Esci"
        className="p-2.5 rounded-lg text-warm-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <LogOut size={18} />
      </button>
      <Link
        href="/"
        title="Torna al sito"
        className="p-2.5 rounded-lg text-warm-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <ExternalLink size={18} />
      </Link>
    </div>
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

      {/* Desktop sidebar — fixed, always visible on lg+ */}
      <aside className="hidden lg:flex w-64 bg-warm-900 text-white fixed top-0 left-0 h-screen flex-col z-40">
        {logoBlock}
        {navBlock}
        {footerBlock}
      </aside>

      {/* Mobile sidebar — overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-warm-900 text-white flex flex-col">
            {logoBlock}
            {navBlock}
            {footerBlock}
          </aside>
        </>
      )}
    </>
  );
}
