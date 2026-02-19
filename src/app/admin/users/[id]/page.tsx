"use client";

import { useParams } from "next/navigation";
import UserForm from "@/components/admin/UserForm";

export default function EditUserPage() {
  const params = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Utente</h1>
      <UserForm userId={params.id as string} />
    </div>
  );
}
