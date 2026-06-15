"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Check, AlertCircle, Mail, Phone, Briefcase, Building2,
  Languages as LangIcon, Tag as TagIcon, Power, Trash2, UserCheck, Clock,
  CheckCircle2, XCircle,
} from "lucide-react";

type Role = "ARCHITECT_DESIGNER" | "PRESS" | "RESELLER" | "AGENT";
const ROLE_LABELS: Record<Role, string> = {
  ARCHITECT_DESIGNER: "Architetto & Designer",
  PRESS: "Stampa",
  RESELLER: "Rivenditore",
  AGENT: "Agente",
};

interface ProTag { id: string; name: string; slug: string; color: string; addedAt: string }
interface ProDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string;
  role: Role;
  language: string;
  acceptsPrivacy: boolean;
  marketingOptIn: boolean;
  pendingApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  approvedAt: string | null;
  tags: ProTag[];
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

export default function ProDetailPage() {
  const params = useParams<{ id: string }>();
  const [pro, setPro] = useState<ProDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", company: "", language: "it", marketingOptIn: false });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPro = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/professionals/${params.id}`).then((r) => r.json());
    if (res.success) {
      setPro(res.data);
      setForm({
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        phone: res.data.phone || "",
        company: res.data.company,
        language: res.data.language,
        marketingOptIn: res.data.marketingOptIn,
      });
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchPro(); }, [fetchPro]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/professionals/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Modifiche salvate", true);
        await fetchPro();
      } else {
        showToast(data.error || "Errore", false);
      }
    } catch { showToast("Errore di rete", false); }
    finally { setSaving(false); }
  };

  const approve = async () => {
    if (!pro) return;
    if (!confirm(`Approvare la richiesta di ${pro.firstName} ${pro.lastName}?\n\nVerrà generata una password temporanea e inviata via email al richiedente.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/professionals/${pro.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.data?.mailOk === false) {
          alert(`Approvato MA invio email FALLITO.\n\nPassword temporanea da comunicare manualmente:\n${data.data.plaintextPassword}\n\nMotivo: ${data.data.mailError || "—"}`);
        } else {
          showToast("Approvato. Email con credenziali inviata.", true);
        }
        await fetchPro();
      } else {
        showToast(data.error || "Errore", false);
      }
    } catch { showToast("Errore di rete", false); }
    finally { setBusy(false); }
  };

  const toggleActive = async () => {
    if (!pro) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/professionals/${pro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pro.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setPro({ ...pro, isActive: !pro.isActive });
        showToast(!pro.isActive ? "Account riattivato" : "Account disattivato", true);
      } else showToast(data.error || "Errore", false);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!pro) return;
    if (!confirm(`Eliminare definitivamente l'account di ${pro.firstName} ${pro.lastName}?\n\nL'operazione è irreversibile.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/professionals/${pro.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/admin/persone/professionisti";
      } else showToast(data.error || "Errore", false);
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-warm-400" size={24} /></div>;
  }
  if (!pro) {
    return <div className="py-24 text-center text-warm-500">Professionista non trovato.</div>;
  }

  const fullName = `${pro.firstName} ${pro.lastName}`;
  const statusBadge = pro.pendingApproval
    ? { text: "In attesa di approvazione", bg: "bg-amber-100", fg: "text-amber-800", icon: <Clock size={11} /> }
    : pro.isActive
      ? { text: "Attivo", bg: "bg-emerald-100", fg: "text-emerald-800", icon: <CheckCircle2 size={11} /> }
      : { text: "Disattivato", bg: "bg-warm-200", fg: "text-warm-700", icon: <XCircle size={11} /> };

  return (
    <div className="w-full">
      <div className="mb-4">
        <Link href="/admin/persone/professionisti" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna alla lista professionisti
        </Link>
      </div>

      {/* Header */}
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-warm-900">{fullName}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-sm text-warm-600"><Mail size={12} /> {pro.email}</span>
            {pro.phone && <span className="inline-flex items-center gap-1 text-sm text-warm-600"><Phone size={12} /> {pro.phone}</span>}
            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${statusBadge.bg} ${statusBadge.fg}`}>
              {statusBadge.icon} {statusBadge.text}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-warm-100 text-warm-800">
              <Briefcase size={11} /> {ROLE_LABELS[pro.role]}
            </span>
          </div>
        </div>

        {/* Azioni rapide */}
        <div className="flex items-center gap-2 shrink-0">
          {pro.pendingApproval && (
            <button onClick={approve} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Approva richiesta
            </button>
          )}
          {!pro.pendingApproval && (
            <button onClick={toggleActive} disabled={busy}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded border disabled:opacity-50 ${
                pro.isActive
                  ? "border-warm-300 text-warm-700 hover:bg-warm-50"
                  : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }`}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {pro.isActive ? "Disattiva" : "Riattiva"}
            </button>
          )}
          <button onClick={remove} disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={14} /> Elimina
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: anagrafica */}
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
              <Building2 size={16} /> Dati anagrafici e azienda
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Nome</label>
                <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Cognome</label>
                <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Telefono</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">
                  {pro.role === "ARCHITECT_DESIGNER" || pro.role === "PRESS" ? "Azienda / Studio / Testata" : "Azienda"}
                </label>
                <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Lingua dell&apos;account</label>
                <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white">
                  <option value="it">Italiano</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => setForm((f) => ({ ...f, marketingOptIn: e.target.checked }))} />
                  Marketing opt-in
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm">
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </section>

          {/* Tag */}
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
              <TagIcon size={16} /> Tag associati ({pro.tags.length})
            </h2>
            {pro.tags.length === 0 ? (
              <div className="text-sm text-warm-400 italic">
                Nessun tag. I tag si gestiscono dalla pagina <Link href="/admin/subscribers" className="underline">Utenti</Link> (lo stesso sistema di tag funziona cross-entità sull&apos;email).
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pro.tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border" style={{ borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` }}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: meta + timeline */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-3">Stato account</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-warm-500 inline-flex items-center gap-1"><Briefcase size={11} /> Ruolo</dt>
                <dd className="text-warm-800 font-medium">{ROLE_LABELS[pro.role]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-500 inline-flex items-center gap-1"><LangIcon size={11} /> Lingua</dt>
                <dd className="text-warm-800 font-mono">{pro.language.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-500">Privacy</dt>
                <dd className="text-warm-800">{pro.acceptsPrivacy ? "Accettata" : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-500">Marketing</dt>
                <dd className="text-warm-800">{pro.marketingOptIn ? "Sì" : "No"}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-3">Timeline</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-warm-500">Richiesta inviata</dt>
                <dd className="text-warm-800">{formatDate(pro.createdAt)}</dd>
              </div>
              {pro.approvedAt && (
                <div className="flex justify-between">
                  <dt className="text-warm-500">Approvato il</dt>
                  <dd className="text-warm-800">{formatDate(pro.approvedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-warm-500">Ultimo accesso</dt>
                <dd className="text-warm-800">{formatDate(pro.lastLoginAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-500">Ultima modifica</dt>
                <dd className="text-warm-800">{formatDate(pro.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 z-50 ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
