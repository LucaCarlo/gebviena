"use client";

import { useParams } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";

export default function EditProjectPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Modifica Progetto</h1>
      <ProjectForm projectId={id} />
    </div>
  );
}
