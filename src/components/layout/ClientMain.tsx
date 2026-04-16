"use client";

import { usePathname } from "next/navigation";

export default function ClientMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const canonicalPath = pathname.replace(/^\/(en|de|fr)(?=\/|$)/, "") || "/";
  const isHomepage = canonicalPath === "/";

  return (
    <main className={isHomepage ? "" : "pt-20 md:pt-24"}>
      {children}
    </main>
  );
}
