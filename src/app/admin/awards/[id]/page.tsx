"use client";

import { useParams } from "next/navigation";
import AwardForm from "@/components/admin/AwardForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

export default function EditAwardPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Premio</h1>
      <EntityTranslationShell entity="award" entityId={id}>
        <AwardForm awardId={id} />
      </EntityTranslationShell>
    </div>
  );
}
