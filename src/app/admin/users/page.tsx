"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { AdminUser } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-yellow-100 text-yellow-800",
  admin: "bg-red-100 text-red-700",
  editor: "bg-blue-100 text-blue-700",
  agent: "bg-green-100 text-green-700",
  client: "bg-purple-100 text-purple-700",
  designer: "bg-amber-100 text-amber-700",
  architect: "bg-teal-100 text-teal-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Mai";
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filters = useMemo(() => {
    const roles = Array.from(new Set(users.map((u) => u.role).filter((v): v is string => !!v))).sort();
    const roleLabels: Record<string, string> = {};
    for (const u of users) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ref = (u as any).roleRef;
      if (ref?.label && u.role) roleLabels[u.role] = ref.label;
    }
    return [
      { key: "role", label: "Tutti i ruoli", options: roles.map((r) => ({ value: r, label: roleLabels[r] || r })) },
      { key: "isActive", label: "Tutti gli stati", options: [{ value: "true", label: "Attivo" }, { value: "false", label: "Disattivo" }] },
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = users;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (activeFilters.role) result = result.filter((u) => u.role === activeFilters.role);
    if (activeFilters.isActive) result = result.filter((u) => String(u.isActive) === activeFilters.isActive);
    return result;
  }, [users, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Utenti</h1>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuovo utente
        </Link>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <>
        <AdminListFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cerca nome o email..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={users.length}
          filteredCount={filteredUsers.length}
        />
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Ruolo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Attivo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Ultimo accesso</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-warm-800">{u.name}</td>
                  <td className="px-6 py-4 text-warm-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${ROLE_COLORS[u.role] || "bg-warm-100 text-warm-600"}`}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(u as any).roleRef?.label || u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="px-6 py-4 text-warm-600 text-xs">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/users/${u.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun utente trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
