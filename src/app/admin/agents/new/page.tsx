"use client";

import StoreForm from "@/components/admin/StoreForm";

export default function NewAgentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Nuovo Agente</h1>
      <StoreForm defaultType="AGENT" backUrl="/admin/agents" />
    </div>
  );
}
