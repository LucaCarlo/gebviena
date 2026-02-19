"use client";

import UserForm from "@/components/admin/UserForm";

export default function NewUserPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Nuovo Utente</h1>
      <UserForm />
    </div>
  );
}
