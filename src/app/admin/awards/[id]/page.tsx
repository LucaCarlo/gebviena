"use client";

import { useParams } from "next/navigation";
import AwardForm from "@/components/admin/AwardForm";

export default function EditAwardPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Premio</h1>
      <AwardForm awardId={params.id as string} />
    </div>
  );
}
