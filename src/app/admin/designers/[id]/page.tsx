"use client";

import { useParams } from "next/navigation";
import DesignerForm from "@/components/admin/DesignerForm";

export default function EditDesignerPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Designer</h1>
      <DesignerForm designerId={params.id as string} />
    </div>
  );
}
