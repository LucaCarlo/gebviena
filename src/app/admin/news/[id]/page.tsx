"use client";

import { useParams } from "next/navigation";
import NewsForm from "@/components/admin/NewsForm";

export default function EditNewsPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Articolo</h1>
      <NewsForm articleId={params.id as string} />
    </div>
  );
}
