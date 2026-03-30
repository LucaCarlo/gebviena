"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  QrCode,
} from "lucide-react";

interface Registration {
  id: string;
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  profile: string | null;
  country: string;
  state: string | null;
  city: string;
  zipCode: string;
  privacyAccepted: boolean;
  marketingConsent: boolean;
  qrCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/event-registrations?${params}`);
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.data);
        setTotal(data.total);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    try {
      const res = await fetch(`/api/event-registrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn }),
      });
      if ((await res.json()).success) fetchData();
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa registrazione?")) return;
    try {
      const res = await fetch(`/api/event-registrations/${id}`, {
        method: "DELETE",
      });
      if ((await res.json()).success) fetchData();
    } catch {
      /* silent */
    }
  };

  const handleExport = () => {
    window.open("/api/event-registrations?format=csv", "_blank");
  };

  const checkedInCount = registrations.filter((r) => r.checkedIn).length;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Registrazioni Evento</h1>
          <p className="text-sm text-warm-500 mt-1">
            {total} registrazioni totali &middot; {checkedInCount} check-in effettuati
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
        >
          <Download size={16} />
          Esporta CSV
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, email o QR code..."
          className="w-full sm:w-96 pl-10 pr-4 py-2.5 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-20 text-warm-500">
          <QrCode size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nessuna registrazione trovata</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50">
                <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">
                  Profilo
                </th>
                <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden lg:table-cell">
                  Luogo
                </th>
                <th className="text-center px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">
                  Check-in
                </th>
                <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">
                  Data
                </th>
                <th className="text-right px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-warm-800">
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="text-[10px] text-warm-400 font-mono mt-0.5">
                      {r.qrCode.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3 text-warm-600">{r.email}</td>
                  <td className="px-4 py-3 text-warm-600 hidden md:table-cell">
                    {r.profile ? (
                      <span className="inline-block text-[10px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded">
                        {r.profile}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-warm-600 hidden lg:table-cell">
                    {r.city}, {r.country}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleCheckIn(r.id, !r.checkedIn)}
                      title={r.checkedIn ? "Annulla check-in" : "Effettua check-in"}
                    >
                      {r.checkedIn ? (
                        <CheckCircle2
                          size={20}
                          className="text-green-500 mx-auto"
                        />
                      ) : (
                        <XCircle
                          size={20}
                          className="text-warm-300 hover:text-warm-500 mx-auto transition-colors"
                        />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">
                    {new Date(r.createdAt).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-warm-400 hover:text-red-500 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
