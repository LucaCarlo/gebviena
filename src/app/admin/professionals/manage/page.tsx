import { Shield } from "lucide-react";
import ManageClient from "./ManageClient";

export const dynamic = "force-dynamic";

export default async function ProfessionalsManagePage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
          <Shield size={22} /> Gestione professionisti
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Contenuti dedicati all’area professionisti: bacheca novità, listini prezzi, informazioni tecniche, materiali aziendali e cataloghi.
        </p>
      </header>
      <ManageClient />
    </div>
  );
}
