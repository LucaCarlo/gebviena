"use client";

import { useParams } from "next/navigation";
import CatalogForm from "@/components/admin/CatalogForm";

export default function EditCatalogPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Catalogo</h1>
      <CatalogForm catalogId={params.id as string} />
    </div>
  );
}
