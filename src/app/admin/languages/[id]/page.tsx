"use client";

import { useParams } from "next/navigation";
import LanguageForm from "@/components/admin/LanguageForm";

export default function EditLanguagePage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Lingua</h1>
      <LanguageForm languageId={params.id as string} />
    </div>
  );
}
