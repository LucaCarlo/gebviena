"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, EyeOff, Pencil } from "lucide-react";
import AwardForm from "@/components/admin/AwardForm";
import EntityTranslationShell from "@/components/admin/EntityTranslationShell";

type Tab = "edit" | "preview";

export default function EditAwardPage() {
  const params = useParams();
  const id = params.id as string;
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("edit");

  useEffect(() => {
    fetch(`/api/awards/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setIsActive(!!d.data.isActive);
      });
  }, [id]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Modifica Premio</h1>
          {isActive !== null && (
            <p className="text-sm text-warm-500 mt-1">
              Stato:{" "}
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <Eye size={12} /> Pubblicato
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                  <EyeOff size={12} /> Bozza
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-warm-200 mb-6">
        <button type="button" onClick={() => setTab("edit")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "edit" ? "border-warm-900 text-warm-900" : "border-transparent text-warm-500 hover:text-warm-900"
          }`}>
          <Pencil size={14} /> Modifica
        </button>
        <button type="button" disabled
          title="Anteprima non disponibile per i premi (nessuna pagina pubblica dedicata)"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium -mb-px border-b-2 border-transparent text-warm-500 opacity-40 cursor-not-allowed">
          <Eye size={14} /> Anteprima
        </button>
      </div>

      <div>
        <EntityTranslationShell entity="award" entityId={id}>
          <AwardForm awardId={id} />
        </EntityTranslationShell>
      </div>
    </div>
  );
}
