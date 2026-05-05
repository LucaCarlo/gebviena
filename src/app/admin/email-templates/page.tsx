"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText, Eye, Copy, Clock, X as XIcon, Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScheduledJob {
  id: string;
  templateId: string;
  templateName: string | null;
  landingPageName: string | null;
  totalCount: number;
  scheduledAt: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  sentCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

type Tab = "templates" | "scheduled";

export default function EmailHomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplLoading, setTplLoading] = useState(true);

  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const r = await fetch("/api/email-templates");
      const d = await r.json();
      if (d.success) setTemplates(d.data || []);
    } catch { /* */ }
    setTplLoading(false);
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const r = await fetch("/api/scheduled-emails");
      const d = await r.json();
      if (d.success) setJobs(d.data || []);
    } catch { /* */ }
    setJobsLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); fetchJobs(); }, [fetchTemplates, fetchJobs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo template?")) return;
    await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    const res = await fetch(`/api/email-templates/${t.id}`);
    const data = await res.json();
    if (!data.success) return;
    await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${t.name} (copia)`, subject: t.subject, blocks: data.data.blocks }),
    });
    fetchTemplates();
  };

  const handleCancelJob = async (id: string) => {
    if (!confirm("Annullare questa email programmata?")) return;
    await fetch(`/api/scheduled-emails/${id}`, { method: "DELETE" });
    fetchJobs();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Email</h1>
          <p className="text-sm text-warm-500 mt-1">Template, programmazioni e cronologia degli invii</p>
        </div>
        {activeTab === "templates" && (
          <Link href="/admin/email-templates/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors">
            <Plus size={16} /> Nuovo Template
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200">
        <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")} icon={<FileText size={14} />} label="Template" count={templates.length} />
        <TabButton active={activeTab === "scheduled"} onClick={() => setActiveTab("scheduled")} icon={<Clock size={14} />} label="Programmate" count={jobs.filter(j => j.status === "pending").length} />
      </div>

      {/* ─── TAB: Templates ─── */}
      {activeTab === "templates" && (
        <>
          {tplLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-warm-400" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-warm-500">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessun template creato</p>
              <Link href="/admin/email-templates/new" className="inline-block mt-4 text-sm text-warm-700 underline hover:text-warm-900">
                Crea il primo template
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden group">
                  <Link href={`/admin/email-templates/${t.id}`} className="block">
                    <div className="h-40 bg-warm-50 border-b border-warm-200 overflow-hidden relative">
                      <iframe
                        srcDoc={`<style>body{margin:0;transform:scale(0.35);transform-origin:top left;width:286%;pointer-events:none;}</style><div id="c"></div><script>fetch('/api/email-templates/${t.id}/preview').then(r=>r.text()).then(h=>document.getElementById('c').innerHTML=h)</script>`}
                        className="w-full h-[460px] pointer-events-none"
                        sandbox="allow-scripts allow-same-origin"
                        title={t.name}
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/admin/email-templates/${t.id}`} className="block">
                      <h3 className="font-semibold text-warm-900 text-sm group-hover:text-warm-700 transition-colors">{t.name}</h3>
                      <p className="text-xs text-warm-500 mt-1 truncate">{t.subject || "Nessun oggetto"}</p>
                    </Link>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-warm-100">
                      <span className="text-[10px] text-warm-400">
                        {new Date(t.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <div className="flex gap-1">
                        <a href={`/api/email-templates/${t.id}/preview`} target="_blank"
                          className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors" title="Anteprima">
                          <Eye size={14} />
                        </a>
                        <button onClick={() => handleDuplicate(t)}
                          className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors" title="Duplica">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Scheduled ─── */}
      {activeTab === "scheduled" && (
        <>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-warm-400" /></div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 text-warm-500">
              <Clock size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessuna email programmata</p>
              <p className="text-xs mt-2">Programma un invio dalla pagina <Link href="/admin/subscribers" className="underline hover:text-warm-700">Utenti</Link> selezionando dei contatti.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 bg-warm-50">
                    <Th>Programmata</Th>
                    <Th>Template</Th>
                    <Th>Tracking</Th>
                    <Th className="text-center">Destinatari</Th>
                    <Th className="text-center">Stato</Th>
                    <Th>Esito</Th>
                    <Th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-warm-50/50">
                      <td className="px-4 py-3 text-warm-700 whitespace-nowrap">
                        <div className="font-medium">{fmtDateTime(j.scheduledAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-warm-700">{j.templateName || "—"}</td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{j.landingPageName || "—"}</td>
                      <td className="px-4 py-3 text-center text-warm-700">{j.totalCount}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={j.status} /></td>
                      <td className="px-4 py-3 text-xs">
                        {j.status === "completed" || j.status === "failed" ? (
                          <span className="text-warm-600">
                            {j.sentCount} inviate{j.failedCount > 0 ? `, ${j.failedCount} fallite` : ""}
                          </span>
                        ) : j.status === "cancelled" ? (
                          <span className="text-warm-400">annullata</span>
                        ) : (
                          <span className="text-warm-400">—</span>
                        )}
                        {j.errorMessage && <div className="text-red-500 text-[10px] mt-0.5 truncate max-w-[280px]" title={j.errorMessage}>{j.errorMessage}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {j.status === "pending" && (
                          <button onClick={() => handleCancelJob(j.id)} className="p-1.5 text-warm-400 hover:text-red-500 transition-colors" title="Annulla">
                            <XIcon size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${active ? "border-warm-800 text-warm-900" : "border-transparent text-warm-400 hover:text-warm-600"}`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className="text-[10px] font-semibold bg-warm-100 text-warm-500 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </button>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider ${className}`}>{children}</th>;
}

function StatusBadge({ status }: { status: ScheduledJob["status"] }) {
  const map: Record<ScheduledJob["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: "In attesa", cls: "bg-amber-100 text-amber-700", icon: <Clock size={11} /> },
    processing: { label: "In invio", cls: "bg-blue-100 text-blue-700", icon: <Loader2 size={11} className="animate-spin" /> },
    completed: { label: "Inviata", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 size={11} /> },
    failed: { label: "Errore", cls: "bg-red-100 text-red-700", icon: <AlertCircle size={11} /> },
    cancelled: { label: "Annullata", cls: "bg-warm-100 text-warm-600", icon: <MailX size={11} /> },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
