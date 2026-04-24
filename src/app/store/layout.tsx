import type { Metadata } from "next";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";

export const metadata: Metadata = {
  title: "Store — Gebrüder Thonet Vienna",
  description: "Acquista online sedute, tavoli e complementi Gebrüder Thonet Vienna.",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-warm-900">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}
