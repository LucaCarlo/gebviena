"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface RoleOption {
  id: string;
  name: string;
  label: string;
}

interface UserFormProps {
  userId?: string;
}

export default function UserForm({ userId }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "editor",
    roleId: "",
    password: "",
    isActive: true,
  });

  // Load available roles from DB
  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRoles(data.data);
          // Set default roleId to editor if no user loaded
          if (!userId) {
            const editor = data.data.find((r: RoleOption) => r.name === "editor");
            if (editor) setForm((prev) => ({ ...prev, roleId: editor.id, role: editor.name }));
          }
        }
      })
      .catch(() => {});
  }, [userId]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/users/${userId}`);
    const data = await res.json();
    if (data.success) {
      const u = data.data;
      setForm({
        email: u.email || "",
        name: u.name || "",
        role: u.role || "editor",
        roleId: u.roleId || "",
        password: "",
        isActive: u.isActive ?? true,
      });
    }
  }, [userId]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload: Record<string, string | boolean> = {
      email: form.email,
      name: form.name,
      role: form.role,
      roleId: form.roleId,
      isActive: form.isActive,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      const url = userId ? `/api/users/${userId}` : "/api/users";
      const method = userId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/users");
      } else {
        setError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (roleId: string) => {
    const selectedRole = roles.find((r) => r.id === roleId);
    setForm((prev) => ({
      ...prev,
      roleId,
      role: selectedRole?.name || prev.role,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Nome *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Ruolo *
          </label>
          <select
            value={form.roleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          >
            <option value="">Seleziona ruolo...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Password {userId ? "" : "*"}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required={!userId}
            placeholder={userId ? "Lascia vuoto per non modificare" : ""}
          />
          {userId && (
            <p className="text-xs text-warm-400 mt-1">
              Lascia vuoto per mantenere la password attuale.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => updateField("isActive", e.target.checked)}
            className="rounded border-warm-300"
          />
          <label htmlFor="isActive" className="text-sm text-warm-600">
            Utente attivo
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : userId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
