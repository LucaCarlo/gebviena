"use client";

import StoreForm from "@/components/admin/StoreForm";

export default function NewStorePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Nuovo Negozio</h1>
      <StoreForm defaultType="STORE" backUrl="/admin/stores" />
    </div>
  );
}
