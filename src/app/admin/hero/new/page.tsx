"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import HeroSlideForm from "@/components/admin/HeroSlideForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function NewHeroSlideContent() {
  const searchParams = useSearchParams();
  const defaultPage = searchParams.get("page") || undefined;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/gestione-contenuti"
          className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-warm-800">Nuovo Slide</h1>
      </div>
      <HeroSlideForm defaultPage={defaultPage} />
    </div>
  );
}

export default function NewHeroSlidePage() {
  return (
    <Suspense fallback={<div className="text-warm-400 py-12">Caricamento...</div>}>
      <NewHeroSlideContent />
    </Suspense>
  );
}
