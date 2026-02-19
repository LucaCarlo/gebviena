"use client";

import { useParams } from "next/navigation";
import HeroSlideForm from "@/components/admin/HeroSlideForm";

export default function EditHeroSlidePage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Slide</h1>
      <HeroSlideForm slideId={params.id as string} />
    </div>
  );
}
