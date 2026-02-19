"use client";

import { useParams } from "next/navigation";
import FinishForm from "@/components/admin/FinishForm";

export default function EditFinishPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Finitura</h1>
      <FinishForm finishId={params.id as string} />
    </div>
  );
}
