"use client";

import { useParams } from "next/navigation";
import CampaignForm from "@/components/admin/CampaignForm";

export default function EditCampaignPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Campagna</h1>
      <CampaignForm campaignId={params.id as string} />
    </div>
  );
}
