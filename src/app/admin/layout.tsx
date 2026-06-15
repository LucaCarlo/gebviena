"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [hideSidebar, setHideSidebar] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Rimuove il widget floating Iubenda dalle pagine admin. Lo script Iubenda
  // inietta i suoi elementi dopo il primo paint con stili inline, quindi:
  //  1. injettiamo un <style> con selettori prudenti (display:none !important)
  //  2. un MutationObserver rimuove fisicamente i nodi appena compaiono.
  useEffect(() => {
    const isIubendaNode = (el: Element): boolean => {
      const tag = el.tagName;
      if (tag === "STYLE" || tag === "SCRIPT") return false;
      const id = el.id || "";
      const cls = (el as HTMLElement).className || "";
      const c = typeof cls === "string" ? cls : "";
      if (id.startsWith("iubenda-") || id.startsWith("iub") || id === "iubFooterBtn") return true;
      if (/\biubenda[-_]?\w*/i.test(c)) return true;
      if (/\biub[-_]?cs/i.test(c)) return true;
      return false;
    };
    const removeAll = () => {
      document.querySelectorAll('[id^="iubenda"], [id^="iub-"], [id="iubFooterBtn"], [class*="iubenda"], [class*="iub-cs"]')
        .forEach((n) => { if (isIubendaNode(n)) n.remove(); });
    };
    removeAll();
    const obs = new MutationObserver((mut) => {
      for (const m of mut) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && isIubendaNode(n as Element)) (n as Element).remove();
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Safety fallback: ripulisce ogni 2s nel caso lo script Iubenda ri-inietti
    const ivl = setInterval(removeAll, 2000);
    return () => { obs.disconnect(); clearInterval(ivl); };
  }, []);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setIsAuthed(true);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const perms = data.data?.permissions || {};
          const role = data.data?.role || "";

          const hasDashboard = role === "superadmin" || perms["dashboard.view"] === true;

          // No dashboard permission → find the first allowed page
          if (!hasDashboard) {
            // Check if user has ONLY landing_page access (scanner-only mode)
            const hasAnyOtherPerm = Object.entries(perms).some(
              ([key, val]) => val === true && !key.startsWith("landing_page.") && !key.startsWith("dashboard.")
            );

            if (!hasAnyOtherPerm) {
              // Scanner-only: no sidebar, redirect to scanner
              setHideSidebar(true);
              if (pathname === "/admin" || (!pathname.startsWith("/admin/scanner") && !pathname.startsWith("/admin/landing-page"))) {
                router.replace("/admin/scanner");
                return;
              }
            } else if (pathname === "/admin") {
              // Has other perms but no dashboard → redirect to first allowed section
              const firstAllowed = findFirstAllowedPath(perms);
              if (firstAllowed) {
                router.replace(firstAllowed);
                return;
              }
            }
          }

          setIsAuthed(true);
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (isAuthed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-pulse text-warm-400">Caricamento...</div>
      </div>
    );
  }

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Nasconde il floating widget Iubenda dentro l'admin (in produzione resta
          attivo solo nel sito pubblico). Selector ridondanti per coprire tutte
          le varianti del banner/icon che lo script Iubenda crea. */}
      <style>{`
        .iubenda-tp-btn,
        [id^="iubenda-cs-"],
        #iubenda-cs-banner,
        #iubenda-cs-tooltip,
        .iubenda-cs-tooltip,
        .iub-content-block,
        [class*="iubenda-fab"],
        [class*="iubenda-floating"] {
          display: none !important;
        }
      `}</style>
      <AdminSidebar />
      <main className="lg:ml-64 flex-1 p-4 pt-18 lg:p-8 lg:pt-8 min-h-screen">{children}</main>
    </div>
  );
}

/** Map permission keys to admin paths */
function findFirstAllowedPath(perms: Record<string, boolean>): string | null {
  const permToPath: [string, string][] = [
    ["products.view", "/admin/products"],
    ["news.view", "/admin/news"],
    ["newsletter.view", "/admin/subscribers"],
    ["landing_page.view", "/admin/landing-page"],
    ["contacts.view", "/admin/contacts"],
    ["stores.view", "/admin/stores"],
    ["media.view", "/admin/media"],
    ["store_orders.view", "/admin/store/orders"],
    ["store_products.view", "/admin/store/products"],
    ["store_categories.view", "/admin/store/categories"],
    ["store_attributes.view", "/admin/store/attributes"],
    ["store_shipping.view", "/admin/store/shipping"],
    ["store_customers.view", "/admin/store/customers"],
    ["store_settings.view", "/admin/store/settings"],
  ];
  for (const [perm, path] of permToPath) {
    if (perms[perm] === true) return path;
  }
  return null;
}
