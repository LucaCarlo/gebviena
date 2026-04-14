"use client";

import { useParams } from "next/navigation";
import CatalogForm from "@/components/admin/CatalogForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

export default function EditCatalogPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Catalogo</h1>
      <EntityTranslationShell entity="catalog" entityId={id}>
        <CatalogForm catalogId={id} />
      </EntityTranslationShell>
    </div>
  );
}
