"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Check, AlertCircle, Mail, Phone, MapPin, Tag as TagIcon,
  Trash2, Globe, Briefcase, MessageSquare, QrCode, ExternalLink,
} from "lucide-react";

interface TagItem { id: string; name: string; slug: string; color: string; addedAt: string }
interface EventReg {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  country: string;
  city: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  languageCode: string | null;
  createdAt: string;
  landingPageId: string | null;
}
interface ContactSub { id: string; type: string; subject: string | null; message: string; isRead: boolean; createdAt: string }
interface ProSummary { id: string; role: string; isActive: boolean; pendingApproval: boolean; createdAt: string }
interface SubDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  profile: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  province: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  acceptsPrivacy: boolean;
  acceptsUpdates: boolean;
  languageCode: string | null;
  ipAddress: string | null;
  geoCity: string | null;
  geoRegion: string | null;
  geoCountry: string | null;
  geoAt: string | null;
  emailStatus: string | null;
  emailError: string | null;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: TagItem[];
  eventRegistrations: EventReg[];
  contactSubmissions: ContactSub[];
  professional: ProSummary | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};
const formatDateShort = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

const ROLE_LABEL: Record<string, string> = {
  ARCHITECT_DESIGNER: "Architetto & Designer",
  PRESS: "Stampa", RESELLER: "Rivenditore", AGENT: "Agente",
};

const FIELDS = [
  ["firstName", "Nome"],
  ["lastName", "Cognome"],
  ["company", "Azienda"],
  ["phone", "Telefono"],
  ["profile", "Profilo professionale"],
  ["address", "Indirizzo"],
  ["city", "Città"],
  ["zip", "CAP"],
  ["province", "Provincia"],
  ["country", "Paese"],
  ["website", "Sito web"],
] as const;

export default function SubscriberDetailPage() {
  const params = useParams<{ id: string }>();
  const [sub, setSub] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [acceptsUpdates, setAcceptsUpdates] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSub = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/newsletter/subscribers/${params.id}`).then((r) => r.json());
    if (res.success) {
      const d: SubDetail = res.data;
      setSub(d);
      const newForm: Record<string, string> = {};
      for (const [k] of FIELDS) newForm[k] = (d[k as keyof SubDetail] as string) || "";
      setForm(newForm);
      setNotes(d.notes || "");
      setAcceptsUpdates(d.acceptsUpdates);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/newsletter/subscribers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notes, acceptsUpdates }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Modifiche salvate", true);
        await fetchSub();
      } else showToast(data.error || "Errore", false);
    } catch { showToast("Errore di rete", false); }
    finally { setSaving(false); }
  };

  const removeAll = async () => {
    if (!sub) return;
    if (!confirm(`Eliminare definitivamente ${sub.email}?\n\nCancellati: iscrizione newsletter, registrazioni eventi, tag. L'operazione è irreversibile.`)) return;
    setBusy(true);
    try {
      await fetch("/api/contacts/unified/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [sub.email] }),
      });
      window.location.href = "/admin/subscribers";
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-warm-400" size={24} /></div>;
  }
  if (!sub) return <div className="py-24 text-center text-warm-500">Utente non trovato.</div>;

  const fullName = [sub.firstName, sub.lastName].filter(Boolean).join(" ") || sub.email;

  return (
    <div className="w-full">
      <div className="mb-4">
        <Link href="/admin/subscribers" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna alla lista utenti
        </Link>
      </div>

      {/* Header */}
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-warm-900">{fullName}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-sm text-warm-600"><Mail size={12} /> {sub.email}</span>
            {sub.phone && <span className="inline-flex items-center gap-1 text-sm text-warm-600"><Phone size={12} /> {sub.phone}</span>}
            {sub.languageCode && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-warm-100 text-warm-800">
                <Globe size={11} /> {sub.languageCode.toUpperCase()}
              </span>
            )}
            {sub.professional && (
              <Link href={`/admin/persone/professionisti/${sub.professional.id}`}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100">
                <Briefcase size={11} /> Anche professionista ({ROLE_LABEL[sub.professional.role] || sub.professional.role})
                <ExternalLink size={9} />
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={removeAll} disabled={busy} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={14} /> Elimina contatto
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: anagrafica + note + storico */}
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-4">Dati anagrafici</h2>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(([key, label]) => (
                <div key={key} className={key === "address" || key === "profile" || key === "website" ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-warm-600 mb-1">{label}</label>
                  <input
                    value={form[key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-warm-600 mb-1">Note interne</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm" placeholder="Annotazioni libere visibili solo agli admin…" />
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-warm-100">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sub.acceptsPrivacy} disabled />
                Privacy accettata {sub.acceptsPrivacy ? "✓" : "—"}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={acceptsUpdates} onChange={(e) => setAcceptsUpdates(e.target.checked)} />
                Vuole aggiornamenti / marketing
              </label>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 disabled:opacity-50 text-sm">
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </section>

          {/* Registrazioni eventi */}
          {sub.eventRegistrations.length > 0 && (
            <section className="bg-white rounded-lg border border-warm-200 p-6">
              <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
                <QrCode size={16} /> Registrazioni a eventi ({sub.eventRegistrations.length})
              </h2>
              <div className="divide-y divide-warm-100">
                {sub.eventRegistrations.map((e) => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="text-warm-800">{e.firstName} {e.lastName} {e.company && <span className="text-warm-500">· {e.company}</span>}</div>
                      <div className="text-xs text-warm-500">{e.city}, {e.country} · {formatDateShort(e.createdAt)}</div>
                    </div>
                    <div className="shrink-0">
                      {e.checkedIn ? (
                        <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Check-in</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider bg-warm-100 text-warm-600 px-2 py-1 rounded">In attesa</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Messaggi contatti */}
          {sub.contactSubmissions.length > 0 && (
            <section className="bg-white rounded-lg border border-warm-200 p-6">
              <h2 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
                <MessageSquare size={16} /> Messaggi inviati ({sub.contactSubmissions.length})
              </h2>
              <div className="space-y-3">
                {sub.contactSubmissions.map((m) => (
                  <details key={m.id} className="border border-warm-100 rounded p-3 text-sm group">
                    <summary className="cursor-pointer flex items-center justify-between">
                      <span className="text-warm-800">
                        {m.subject || <span className="italic text-warm-500">(senza oggetto)</span>}
                        <span className="text-xs text-warm-500 ml-2">[{m.type}]</span>
                      </span>
                      <span className="text-xs text-warm-500 shrink-0 ml-3">{formatDateShort(m.createdAt)}</span>
                    </summary>
                    <div className="mt-2 text-warm-700 whitespace-pre-wrap text-[13px] leading-relaxed">{m.message}</div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT: tags + geo + timeline */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-900 mb-3 text-sm flex items-center gap-2">
              <TagIcon size={14} /> Tag ({sub.tags.length})
            </h3>
            {sub.tags.length === 0 ? (
              <div className="text-xs text-warm-400 italic">Nessun tag.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sub.tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center text-xs px-2 py-1 rounded border" style={{ borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` }}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[10px] text-warm-400 mt-3">
              I tag si assegnano dalla lista utenti con selezione multipla.
            </div>

            {/* Origine (badge sotto i tag) — derivato a partire da
                eventRegistrations + tag slug, perché su detail il subscriber
                è già implicito (siamo arrivati dal suo id). */}
            {(() => {
              const isSvendita = sub.tags.some((t) => t.slug?.includes("svendita") || t.slug?.includes("vendita-speciale"));
              const isEvent = sub.eventRegistrations.length > 0;
              const label = isSvendita ? "Vendita Speciale"
                : isEvent ? "Newsletter + Evento"
                : "Newsletter";
              const cls = isSvendita ? "bg-rose-100 text-rose-700"
                : isEvent ? "bg-purple-100 text-purple-600"
                : "bg-blue-100 text-blue-600";
              return (
                <div className="mt-4 pt-3 border-t border-warm-100">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-warm-500 mb-1.5">Origine</div>
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>{label}</span>
                </div>
              );
            })()}
          </section>

          {(sub.geoCity || sub.geoCountry || sub.ipAddress) && (
            <section className="bg-white rounded-lg border border-warm-200 p-4">
              <h3 className="font-medium text-warm-900 mb-3 text-sm flex items-center gap-2">
                <MapPin size={14} /> Geolocalizzazione iscrizione
              </h3>
              <dl className="space-y-1 text-xs">
                {sub.geoCity && <div className="flex justify-between"><dt className="text-warm-500">Città</dt><dd className="text-warm-800">{sub.geoCity}</dd></div>}
                {sub.geoRegion && <div className="flex justify-between"><dt className="text-warm-500">Regione</dt><dd className="text-warm-800">{sub.geoRegion}</dd></div>}
                {sub.geoCountry && <div className="flex justify-between"><dt className="text-warm-500">Paese</dt><dd className="text-warm-800">{sub.geoCountry}</dd></div>}
                {sub.ipAddress && <div className="flex justify-between"><dt className="text-warm-500">IP</dt><dd className="text-warm-800 font-mono text-[10px]">{sub.ipAddress}</dd></div>}
                {sub.geoAt && <div className="flex justify-between"><dt className="text-warm-500">Rilevato</dt><dd className="text-warm-800">{formatDateShort(sub.geoAt)}</dd></div>}
              </dl>
            </section>
          )}

          <section className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-900 mb-3 text-sm">Timeline</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-warm-500">Iscritto il</dt><dd className="text-warm-800">{formatDate(sub.createdAt)}</dd></div>
              {sub.updatedAt && <div className="flex justify-between"><dt className="text-warm-500">Aggiornato</dt><dd className="text-warm-800">{formatDate(sub.updatedAt)}</dd></div>}
              {sub.emailStatus && (
                <div className="flex justify-between"><dt className="text-warm-500">Esito email conferma</dt><dd className={sub.emailStatus === "sent" ? "text-emerald-700" : "text-red-700"}>{sub.emailStatus}</dd></div>
              )}
              {sub.emailSentAt && <div className="flex justify-between"><dt className="text-warm-500">Inviata il</dt><dd className="text-warm-800">{formatDateShort(sub.emailSentAt)}</dd></div>}
              {sub.emailError && <div className="text-[10px] text-red-700 mt-1">{sub.emailError}</div>}
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
