"use client";

import { useParams } from "next/navigation";
import CampaignForm from "@/components/admin/CampaignForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

export default function EditCampaignPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Campagna</h1>
      <EntityTranslationShell entity="campaign" entityId={id}>
        <CampaignForm campaignId={id} />
      </EntityTranslationShell>
    </div>
  );
}
