"use client";

import { useParams } from "next/navigation";
import NewsForm from "@/components/admin/NewsForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

export default function EditNewsPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Articolo</h1>
      <EntityTranslationShell entity="news" entityId={id}>
        <NewsForm articleId={id} />
      </EntityTranslationShell>
    </div>
  );
}
