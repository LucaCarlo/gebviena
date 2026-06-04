"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Check, AlertCircle, Trash2, Power, UserCheck } from "lucide-react";

interface Professional {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string;
  role: "ARCHITECT_DESIGNER" | "PRESS" | "RESELLER" | "AGENT";
  language: string;
  marketingOptIn: boolean;
  isActive: boolean;
  pendingApproval: boolean;
  approvedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<Professional["role"], string> = {
  ARCHITECT_DESIGNER: "Architetto & Designer",
  PRESS: "Stampa",
  RESELLER: "Rivenditore",
  AGENT: "Agente",
};

const ROLE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "",                    label: "Tutti i ruoli" },
  { value: "ARCHITECT_DESIGNER",  label: "Architetti & Designer" },
  { value: "PRESS",               label: "Stampa" },
  { value: "RESELLER",            label: "Rivenditori" },
  { value: "AGENT",               label: "Agenti" },
];

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

export default function AdminProfessionalsPage() {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [status, setStatus] = useState<"" | "pending" | "approved">("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (role) sp.set("role", role);
      if (active) sp.set("active", active);
      if (status) sp.set("status", status);
      const res = await fetch(`/api/admin/professionals?${sp}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setItems(data.data);
      else showToast(data.error || "Errore caricamento", false);
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setLoading(false);
    }
  }, [q, role, active, status]);

  // Debounce della query di ricerca
  useEffect(() => {
    const t = setTimeout(fetchItems, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchItems, q]);

  const toggleActive = async (p: Professional) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/professionals/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((arr) => arr.map((x) => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
        showToast(!p.isActive ? "Account riattivato" : "Account disattivato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (p: Professional) => {
    if (!confirm(`Approvare la richiesta di ${p.firstName} ${p.lastName} (${p.email})?\n\nVerrà generata una password temporanea e inviata via email al richiedente.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/professionals/${p.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setItems((arr) => arr.map((x) => x.id === p.id ? { ...x, pendingApproval: false, isActive: true, approvedAt: new Date().toISOString() } : x));
        if (data.data?.mailOk === false) {
          // Email fallita: mostra la password in chiaro all'admin per gestione manuale
          alert(`Account approvato MA invio email FALLITO.\n\nPassword temporanea da comunicare manualmente:\n${data.data.plaintextPassword}\n\nMotivo errore: ${data.data.mailError || "—"}`);
        } else {
          showToast(`${p.firstName} approvato. Email inviata.`, true);
        }
      } else {
        showToast(data.error || "Errore approvazione", false);
      }
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Professional) => {
    if (!confirm(`Eliminare definitivamente l'account di ${p.firstName} ${p.lastName} (${p.email})?\n\nL'operazione è irreversibile.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/professionals/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((arr) => arr.filter((x) => x.id !== p.id));
        showToast("Account eliminato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } catch {
      showToast("Errore di rete", false);
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter((i) => i.isActive && !i.pendingApproval).length,
    inactive: items.filter((i) => !i.isActive && !i.pendingApproval).length,
    pending: items.filter((i) => i.pendingApproval).length,
  }), [items]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900">Professionisti</h1>
        <p className="text-sm text-warm-500 mt-1">
          Account registrati all&apos;area riservata professionisti del sito.
          {!loading && <> · <strong>{counts.total}</strong> totali · <strong className="text-amber-700">{counts.pending}</strong> in attesa · <strong className="text-emerald-700">{counts.active}</strong> attivi · <strong className="text-warm-500">{counts.inactive}</strong> disattivati</>}
        </p>
      </header>

      {/* Filtri */}
      <div className="bg-white border border-warm-200 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca nome, email o azienda…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none bg-white"
        >
          {ROLE_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "pending" | "approved")}
          className="px-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none bg-white"
        >
          <option value="">Tutte le richieste</option>
          <option value="pending">Solo in attesa</option>
          <option value="approved">Solo approvati</option>
        </select>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value as "" | "true" | "false")}
          className="px-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none bg-white"
        >
          <option value="">Tutti gli stati</option>
          <option value="true">Solo attivi</option>
          <option value="false">Solo disattivati</option>
        </select>
      </div>

      {/* Tabella */}
      <div className="bg-white border border-warm-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-warm-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-warm-500 text-sm">Nessun professionista trovato.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs">
              <tr>
                <th className="px-4 py-2.5 text-left">Nome</th>
                <th className="px-4 py-2.5 text-left">Email</th>
                <th className="px-4 py-2.5 text-left">Azienda</th>
                <th className="px-4 py-2.5 text-left">Ruolo</th>
                <th className="px-4 py-2.5 text-left">Lingua</th>
                <th className="px-4 py-2.5 text-left">Registrato</th>
                <th className="px-4 py-2.5 text-left">Ultimo accesso</th>
                <th className="px-4 py-2.5 text-center w-44">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {items.map((p) => {
                const isBusy = busyId === p.id;
                return (
                  <tr key={p.id} className={p.pendingApproval ? "bg-amber-50/40" : (p.isActive ? "" : "bg-warm-50/40 opacity-75")}>
                    <td className="px-4 py-2.5 text-warm-800">
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      {p.pendingApproval && (
                        <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">in attesa di approvazione</span>
                      )}
                      {!p.pendingApproval && !p.isActive && (
                        <span className="text-[10px] uppercase tracking-wider bg-warm-200 text-warm-700 px-1.5 py-0.5 rounded">disattivato</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-warm-700">
                      <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>
                      {p.phone && <div className="text-[11px] text-warm-500 mt-0.5">{p.phone}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-warm-700">{p.company}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 text-[11px] uppercase tracking-wider bg-warm-100 text-warm-800 rounded">
                        {ROLE_LABELS[p.role]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-warm-600 font-mono text-[12px]">{p.language.toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-warm-600 text-[12px]">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-2.5 text-warm-600 text-[12px]">{formatDate(p.lastLoginAt)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        {p.pendingApproval ? (
                          <button
                            type="button"
                            onClick={() => approve(p)}
                            disabled={isBusy}
                            title="Approva: genera password e invia email con le credenziali"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                            Approva
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            disabled={isBusy}
                            title={p.isActive ? "Disattiva: l'utente non potrà più accedere" : "Riattiva l'accesso"}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors disabled:opacity-50 ${
                              p.isActive
                                ? "border-warm-300 text-warm-700 hover:bg-warm-50"
                                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                            {p.isActive ? "Disattiva" : "Riattiva"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(p)}
                          disabled={isBusy}
                          title="Elimina definitivamente l'account"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 z-50 ${
          toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
