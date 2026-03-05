"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Save,
  Trash2,
  Check,
  Lock,
} from "lucide-react";
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from "@/lib/constants";

interface RoleData {
  id: string;
  name: string;
  label: string;
  permissions: Record<string, boolean>;
  isSystem: boolean;
  sortOrder: number;
  userCount: number;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  useEffect(() => {
    if (selectedRole) {
      setEditLabel(selectedRole.label);
      setEditPermissions({ ...selectedRole.permissions });
    }
  }, [selectedRoleId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newRoleName.trim()) return;
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoleName, label: newRoleName, permissions: {} }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchRoles();
      setSelectedRoleId(data.data.id);
      setCreating(false);
      setNewRoleName("");
      showToast("Ruolo creato!");
    } else {
      showToast(data.error || "Errore");
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    const res = await fetch(`/api/roles/${selectedRoleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel, permissions: editPermissions }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchRoles();
      showToast("Ruolo salvato!");
    } else {
      showToast(data.error || "Errore");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedRoleId || !selectedRole) return;
    if (!confirm(`Eliminare il ruolo "${selectedRole.label}"?`)) return;
    const res = await fetch(`/api/roles/${selectedRoleId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setSelectedRoleId(null);
      await fetchRoles();
      showToast("Ruolo eliminato!");
    } else {
      showToast(data.error || "Errore");
    }
  };

  const togglePermission = (key: string) => {
    // Cannot edit superadmin permissions
    if (selectedRole?.name === "superadmin") return;
    setEditPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleResourceAll = (resourceKey: string) => {
    if (selectedRole?.name === "superadmin") return;
    const allEnabled = PERMISSION_ACTIONS.every(
      (a) => editPermissions[`${resourceKey}.${a.key}`]
    );
    setEditPermissions((prev) => {
      const next = { ...prev };
      for (const a of PERMISSION_ACTIONS) {
        next[`${resourceKey}.${a.key}`] = !allEnabled;
      }
      return next;
    });
  };

  const toggleActionAll = (actionKey: string) => {
    if (selectedRole?.name === "superadmin") return;
    const allEnabled = PERMISSION_RESOURCES.every(
      (r) => editPermissions[`${r.key}.${actionKey}`]
    );
    setEditPermissions((prev) => {
      const next = { ...prev };
      for (const r of PERMISSION_RESOURCES) {
        next[`${r.key}.${actionKey}`] = !allEnabled;
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRole?.name === "superadmin") return;
    const allEnabled = PERMISSION_RESOURCES.every((r) =>
      PERMISSION_ACTIONS.every((a) => editPermissions[`${r.key}.${a.key}`])
    );
    setEditPermissions((prev) => {
      const next = { ...prev };
      for (const r of PERMISSION_RESOURCES) {
        for (const a of PERMISSION_ACTIONS) {
          next[`${r.key}.${a.key}`] = !allEnabled;
        }
      }
      return next;
    });
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800">
          <Check size={16} />
          {toast}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-warm-900">Gestione Ruoli</h1>
          <p className="text-xs text-warm-500 mt-0.5">
            Crea ruoli e personalizza i permessi per ogni azione
          </p>
        </div>
        {selectedRoleId && selectedRole && !selectedRole.isSystem && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-warm-800 text-white px-5 py-2 rounded-lg text-xs font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Save size={14} /> {saving ? "Salvataggio..." : "Salva"}
          </button>
        )}
        {selectedRoleId && selectedRole && selectedRole.isSystem && (
          <button
            onClick={handleSave}
            disabled={saving || selectedRole.name === "superadmin"}
            className="bg-warm-800 text-white px-5 py-2 rounded-lg text-xs font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Save size={14} /> {saving ? "Salvataggio..." : "Salva Permessi"}
          </button>
        )}
      </div>

      <div className="flex gap-4">
        {/* ── LEFT: Role List ──────────────────────────────── */}
        <div className="w-56 flex-shrink-0 space-y-2">
          {creating ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Nome ruolo..."
                className="flex-1 border border-warm-300 rounded-lg px-3 py-2 text-xs focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setCreating(false); setNewRoleName(""); }
                }}
              />
              <button
                onClick={handleCreate}
                className="p-2 text-green-600 hover:text-green-700"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border border-dashed border-warm-300 text-warm-600 hover:border-warm-500 hover:text-warm-800 transition-colors"
            >
              <Plus size={14} /> Nuovo Ruolo
            </button>
          )}

          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                selectedRoleId === role.id
                  ? "bg-warm-800 text-white"
                  : "bg-white border border-warm-200 text-warm-700 hover:bg-warm-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {role.isSystem && (
                  <Lock
                    size={10}
                    className={
                      selectedRoleId === role.id ? "text-warm-300" : "text-warm-400"
                    }
                  />
                )}
                <span className="font-medium truncate">{role.label}</span>
              </div>
              <div
                className={`text-[10px] mt-0.5 ${
                  selectedRoleId === role.id ? "text-warm-300" : "text-warm-400"
                }`}
              >
                {role.userCount} utent{role.userCount === 1 ? "e" : "i"}
                {role.isSystem ? " · Sistema" : ""}
              </div>
            </button>
          ))}
        </div>

        {/* ── RIGHT: Permission Matrix ─────────────────────── */}
        {selectedRole ? (
          <div className="flex-1 min-w-0 space-y-4">
            {/* Role header */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-warm-600" />
                  {selectedRole.isSystem ? (
                    <div>
                      <h2 className="text-lg font-semibold text-warm-900">
                        {selectedRole.label}
                      </h2>
                      <p className="text-[10px] text-warm-400">
                        Ruolo di sistema · {selectedRole.name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="text-lg font-semibold text-warm-900 border-0 border-b border-warm-200 focus:border-warm-800 focus:outline-none w-full bg-transparent"
                      />
                      <p className="text-[10px] text-warm-400 mt-1">
                        Ruolo personalizzato · {selectedRole.name}
                      </p>
                    </div>
                  )}
                </div>
                {!selectedRole.isSystem && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-warm-400 hover:text-red-500 transition-colors"
                    title="Elimina ruolo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Superadmin notice */}
            {selectedRole.name === "superadmin" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                Il Super Admin ha tutti i permessi abilitati e non possono essere modificati.
              </div>
            )}

            {/* Permission matrix */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-200 bg-warm-50">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-warm-500 uppercase tracking-wider w-48">
                        <button
                          onClick={toggleAll}
                          className="hover:text-warm-800 transition-colors"
                          disabled={selectedRole.name === "superadmin"}
                        >
                          Risorsa
                        </button>
                      </th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th
                          key={action.key}
                          className="text-center px-3 py-3 text-[10px] font-semibold text-warm-500 uppercase tracking-wider"
                        >
                          <button
                            onClick={() => toggleActionAll(action.key)}
                            className="hover:text-warm-800 transition-colors"
                            disabled={selectedRole.name === "superadmin"}
                          >
                            {action.label}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_RESOURCES.map((resource, i) => (
                      <tr
                        key={resource.key}
                        className={
                          i % 2 === 0 ? "bg-white" : "bg-warm-50/50"
                        }
                      >
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => toggleResourceAll(resource.key)}
                            className="text-sm text-warm-700 hover:text-warm-900 font-medium transition-colors"
                            disabled={selectedRole.name === "superadmin"}
                          >
                            {resource.label}
                          </button>
                        </td>
                        {PERMISSION_ACTIONS.map((action) => {
                          const key = `${resource.key}.${action.key}`;
                          const enabled =
                            selectedRole.name === "superadmin"
                              ? true
                              : editPermissions[key] ?? false;
                          return (
                            <td key={key} className="text-center px-3 py-2.5">
                              <button
                                onClick={() => togglePermission(key)}
                                disabled={selectedRole.name === "superadmin"}
                                className={`w-9 h-5 rounded-full relative transition-colors ${
                                  enabled
                                    ? "bg-green-500"
                                    : "bg-warm-300"
                                } ${
                                  selectedRole.name === "superadmin"
                                    ? "opacity-60 cursor-not-allowed"
                                    : "cursor-pointer hover:opacity-80"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                    enabled ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-20 text-warm-400 text-sm">
            Seleziona un ruolo per gestire i permessi
          </div>
        )}
      </div>
    </div>
  );
}
