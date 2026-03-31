"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [hideSidebar, setHideSidebar] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
              // Scanner-only: no sidebar, redirect to landing-page
              setHideSidebar(true);
              if (pathname === "/admin" || !pathname.startsWith("/admin/landing-page")) {
                router.replace("/admin/landing-page");
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
    return (
      <div className="min-h-screen bg-warm-50">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
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
  ];
  for (const [perm, path] of permToPath) {
    if (perms[perm] === true) return path;
  }
  return null;
}
