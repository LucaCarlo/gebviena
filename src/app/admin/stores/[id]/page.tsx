"use client";

import { useParams } from "next/navigation";
import StoreForm from "@/components/admin/StoreForm";

export default function EditStorePage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Negozio</h1>
      <StoreForm storeId={id} defaultType="STORE" backUrl="/admin/stores" />
    </div>
  );
}
