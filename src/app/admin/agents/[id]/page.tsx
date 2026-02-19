"use client";

import { useParams } from "next/navigation";
import StoreForm from "@/components/admin/StoreForm";

export default function EditAgentPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Agente</h1>
      <StoreForm storeId={id} defaultType="AGENT" backUrl="/admin/agents" />
    </div>
  );
}
