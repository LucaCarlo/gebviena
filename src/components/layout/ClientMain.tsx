"use client";

import { usePathname } from "next/navigation";

export default function ClientMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  return (
    <main className={isHomepage ? "" : "pt-20 md:pt-24"}>
      {children}
    </main>
  );
}
