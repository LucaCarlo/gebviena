"use client";

import { useParams } from "next/navigation";
import HeroSlideForm from "@/components/admin/HeroSlideForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditHeroSlidePage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/gestione-immagini"
          className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-warm-800">Modifica Slide</h1>
      </div>
      <EntityTranslationShell entity="hero" entityId={id}>
        <HeroSlideForm slideId={id} />
      </EntityTranslationShell>
    </div>
  );
}
