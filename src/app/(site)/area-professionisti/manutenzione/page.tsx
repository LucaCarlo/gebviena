import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getProSettings } from "@/lib/pro-settings";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const s = await getProSettings();
  return (
    <main className="min-h-screen bg-warm-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center">
        <AlertTriangle size={32} className="mx-auto text-warm-500 mb-4" />
        <h1 className="text-3xl md:text-5xl font-serif text-warm-900 tracking-tight mb-4">
          {s.maintenanceTitle}
        </h1>
        <p className="text-base md:text-lg text-warm-700 leading-relaxed whitespace-pre-line mb-8">
          {s.maintenanceMessage}
        </p>
        <Link
          href="/"
          className="inline-block text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
        >
          ← Torna al sito
        </Link>
      </div>
    </main>
  );
}
