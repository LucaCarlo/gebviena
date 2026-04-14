"use client";

import { useParams } from "next/navigation";
import DesignerForm from "@/components/admin/DesignerForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

export default function EditDesignerPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Designer</h1>
      <EntityTranslationShell entity="designer" entityId={id}>
        <DesignerForm designerId={id} />
      </EntityTranslationShell>
    </div>
  );
}
