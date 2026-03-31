"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, Download, Trash2, CheckCircle2, XCircle, Users, Send, X, Mail,
  Tag, Plus, Loader2, Upload, FileText, Pencil, Eye, Building2,
  MapPin, StickyNote, User, ChevronLeft,
} from "lucide-react";

/* ───── Types ───── */

interface TagInfo { id: string; name: string; slug: string; color: string; }
interface TagWithCount extends TagInfo { count: number; }

interface UnifiedContact {
  email: string; firstName: string | null; lastName: string | null;
  company: string | null; phone: string | null; profile: string | null;
  address: string | null; city: string | null; zip: string | null;
  province: string | null; country: string | null; website: string | null;
  notes: string | null; source: string; subscriberId: string | null;
  createdAt: string; updatedAt: string | null; tags: TagInfo[];
}

interface EventReg {
  id: string; firstName: string; lastName: string; email: string;
  profile: string | null; country: string; city: string; qrCode: string;
  checkedIn: boolean; checkedInAt: string | null; createdAt: string;
}

interface EmailTemplate { id: string; name: string; subject: string; }

type EventFilter = "all" | "participated" | "not_participated";

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", company: "", phone: "",
  profile: "", address: "", city: "", zip: "", province: "", country: "",
  website: "", notes: "", subscriberId: "",
};

/* ───── Component ───── */

export default function AdminSubscribersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Unified contacts
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // by email

  // Event registrations (for evento detail view)
  const [eventRegs, setEventRegs] = useState<EventReg[]>([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSimpleEmail, setShowSimpleEmail] = useState(false);
  const [showTagAssign, setShowTagAssign] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEmailChoice, setShowEmailChoice] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [viewContact, setViewContact] = useState<UnifiedContact | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Invite to event
  const [landingPages, setLandingPages] = useState<{ id: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; tagged: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ───── Fetch ───── */

  const fetchTags = useCallback(async () => {
    try { const r = await fetch("/api/tags"); const d = await r.json(); if (d.success) setTags(d.data || []); } catch {}
  }, []);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try { const r = await fetch("/api/contacts/unified"); const d = await r.json(); if (d.success) setContacts(d.data || []); } catch {}
    setContactsLoading(false);
  }, []);

  const fetchEventRegs = useCallback(async () => {
    setEventLoading(true);
    try { const r = await fetch("/api/event-registrations"); const d = await r.json(); if (d.success) setEventRegs(d.data); } catch {}
    setEventLoading(false);
  }, []);

  useEffect(() => { fetchTags(); fetchContacts(); fetchEventRegs(); }, [fetchTags, fetchContacts, fetchEventRegs]);

  /* ───── Filters ───── */

  const isEventoDetail = activeTab === "tag:evento";

  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.email.toLowerCase().includes(q) ||
        (c.firstName || "").toLowerCase().includes(q) ||
        (c.lastName || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.country || "").toLowerCase().includes(q)
      );
    }
    if (activeTab !== "all" && activeTab.startsWith("tag:") && !isEventoDetail) {
      const slug = activeTab.replace("tag:", "");
      list = list.filter((c) => c.tags.some((t) => t.slug === slug));
    }
    return list;
  }, [contacts, search, activeTab, isEventoDetail]);

  const filteredEvent = useMemo(() => {
    let list = eventRegs;
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.email.toLowerCase().includes(q) || r.firstName.toLowerCase().includes(q) || r.lastName.toLowerCase().includes(q)); }
    if (eventFilter === "participated") list = list.filter((r) => r.checkedIn);
    if (eventFilter === "not_participated") list = list.filter((r) => !r.checkedIn);
    return list;
  }, [eventRegs, search, eventFilter]);

  /* ───── Selection (by email) ───── */

  const currentList = isEventoDetail ? [] : filteredContacts;
  const toggleSelect = (email: string) => setSelected((p) => { const n = new Set(Array.from(p)); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const selectAll = () => selected.size === currentList.length ? setSelected(new Set()) : setSelected(new Set(currentList.map((c) => c.email)));
  const getSelectedEmails = () => Array.from(selected);
  const getSelectedSubscriberIds = () => contacts.filter((c) => selected.has(c.email) && c.subscriberId).map((c) => c.subscriberId as string);

  /* ───── Delete ───── */

  const handleDeleteContact = async (email: string) => {
    if (!confirm("Eliminare questo contatto?")) return;
    const contact = contacts.find((c) => c.email === email);
    if (contact?.subscriberId) {
      await fetch(`/api/newsletter/subscribers/${contact.subscriberId}`, { method: "DELETE" });
    }
    fetchContacts(); fetchTags();
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Eliminare ${selected.size} contatti?`)) return;
    const ids = getSelectedSubscriberIds();
    if (ids.length > 0) {
      await fetch("/api/newsletter/subscribers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    }
    setSelected(new Set());
    fetchContacts(); fetchTags();
  };

  /* ───── Edit contact ───── */

  const openEditContact = (c: UnifiedContact) => {
    setEditForm({
      firstName: c.firstName || "", lastName: c.lastName || "", email: c.email,
      company: c.company || "", phone: c.phone || "", profile: c.profile || "",
      address: c.address || "", city: c.city || "", zip: c.zip || "",
      province: c.province || "", country: c.country || "", website: c.website || "",
      notes: c.notes || "", subscriberId: c.subscriberId || "",
    });
    setShowEditContact(true);
  };

  const saveEditContact = async () => {
    if (!editForm.subscriberId) { alert("Questo contatto non è un iscritto newsletter e non può essere modificato"); return; }
    if (!editForm.email.trim()) { alert("L'email è obbligatoria"); return; }
    setEditSaving(true);
    try {
      const { subscriberId, ...data } = editForm;
      const r = await fetch(`/api/newsletter/subscribers/${subscriberId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (d.success) {
        setShowEditContact(false);
        fetchContacts();
        // Update view contact if open
        if (viewContact && viewContact.email === editForm.email) {
          setViewContact((prev) => prev ? { ...prev, ...data } : null);
        }
      } else alert(d.error || "Errore");
    } catch { alert("Errore"); }
    setEditSaving(false);
  };

  /* ───── Simple email ───── */

  const sendSimpleEmail = async () => {
    if (!selected.size) return;
    if (!emailSubject.trim() || !emailBody.trim()) { alert("Compila oggetto e corpo"); return; }
    setSending(true); setSendResult(null);
    const ids = getSelectedSubscriberIds();
    if (!ids.length) { alert("Nessun iscritto newsletter selezionato"); setSending(false); return; }
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">${emailBody.replace(/\n/g, "<br>")}</div>`;
    try {
      const r = await fetch("/api/newsletter/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriberIds: ids, subject: emailSubject, html }) });
      const d = await r.json();
      if (d.success) setSendResult(d.data); else alert(d.error);
    } catch { alert("Errore"); }
    setSending(false);
  };

  /* ───── Send via template ───── */

  const [templateLpId, setTemplateLpId] = useState("");

  const openTemplateModal = async () => {
    setShowTemplateModal(true); setTemplatesLoading(true); setSendResult(null); setTemplateLpId("");
    try {
      const [tplRes, lpRes] = await Promise.all([
        fetch("/api/email-templates").then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/landing-page-config?admin=true").then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (tplRes.success) setTemplates(tplRes.data || []);
      let lps: { id: string; name: string }[] = [];
      if (lpRes.success && lpRes.data) {
        lps = (Array.isArray(lpRes.data) ? lpRes.data : [lpRes.data]).map((lp: { id: string; name: string }) => ({ id: lp.id, name: lp.name }));
      }
      if (!lps.length) {
        const r2 = await fetch("/api/landing-page-config").then(r => r.json()).catch(() => ({ success: false }));
        if (r2.success && r2.data) {
          const data = Array.isArray(r2.data) ? r2.data : [r2.data];
          lps = data.map((lp: { id: string; name: string }) => ({ id: lp.id, name: lp.name }));
        }
      }
      setLandingPages(lps);
    } catch {}
    setTemplatesLoading(false);
  };

  const sendWithTemplate = async (templateId: string) => {
    if (!selected.size) return;
    const ids = getSelectedSubscriberIds();
    if (!ids.length) { alert("Nessun iscritto newsletter selezionato"); return; }
    setSending(true); setSendResult(null);
    try {
      const body: Record<string, unknown> = { subscriberIds: ids, templateId };
      if (templateLpId) body.landingPageId = templateLpId;
      const r = await fetch("/api/newsletter/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) setSendResult(d.data); else alert(d.error);
    } catch { alert("Errore"); }
    setSending(false);
  };

  /* ───── Invite to event ───── */

  /* ───── Tags ───── */

  const createTag = async () => {
    if (!newTagName.trim()) return;
    await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTagName.trim() }) });
    setNewTagName(""); setShowNewTag(false); fetchTags(); fetchContacts();
  };

  const assignTag = async (tagId: string) => {
    await fetch("/api/tags/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: getSelectedEmails(), tagIds: [tagId] }) });
    fetchContacts(); fetchTags(); setShowTagAssign(false);
  };

  const removeTag = async (tagId: string) => {
    await fetch("/api/tags/assign", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: getSelectedEmails(), tagIds: [tagId] }) });
    fetchContacts(); fetchTags();
  };

  /* ───── Event ───── */

  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    await fetch(`/api/event-registrations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkedIn }) });
    fetchEventRegs();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Eliminare?")) return;
    await fetch(`/api/event-registrations/${id}`, { method: "DELETE" }); fetchEventRegs();
  };

  /* ───── Import CSV ───── */

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { alert("File vuoto"); setImporting(false); return; }
      const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(/[,;\t]/).map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { if (vals[idx]) row[h] = vals[idx]; });
        const mapped = {
          email: row.email || row.mail || row["e-mail"] || "",
          firstName: row.firstname || row.nome || row.first_name || row.name || "",
          lastName: row.lastname || row.cognome || row.last_name || row.surname || "",
          company: row.company || row.azienda || row.società || "",
          phone: row.phone || row.telefono || row.tel || "",
          profile: row.profile || row.profilo || row.ruolo || row.role || "",
          address: row.address || row.indirizzo || row.via || "",
          city: row.city || row.città || row.citta || "",
          zip: row.zip || row.cap || row.postal_code || "",
          province: row.province || row.provincia || row.prov || "",
          country: row.country || row.paese || row.nazione || row.stato || "",
          website: row.website || row.sito || row.url || row.web || "",
          notes: row.notes || row.note || "",
          tags: row.tag || row.tags || "",
        };
        if (mapped.email) rows.push(mapped);
      }
      const r = await fetch("/api/newsletter/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const d = await r.json();
      if (d.success) { setImportResult(d); fetchContacts(); fetchTags(); } else alert(d.error);
    } catch { alert("Errore lettura file"); }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = "Nome,Cognome,Email,Azienda,Telefono,Profilo,Indirizzo,Città,CAP,Provincia,Paese,Website,Note,Tag\nMario,Rossi,mario@esempio.com,Azienda Srl,+39123456789,Architetto,Via Roma 1,Milano,20121,MI,Italia,www.esempio.com,Cliente top,\"Newsletter,Evento\"\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template-import-utenti.csv"; a.click();
  };

  /* ───── Computed ───── */

  const checkedInCount = eventRegs.filter((r) => r.checkedIn).length;
  const tabItems = [
    { key: "all", label: "Tutti", count: contacts.length, color: "#374151" },
    ...tags.map((t) => ({ key: `tag:${t.slug}`, label: t.name, count: t.count, color: t.color })),
  ];

  /* ───── Contact detail helpers ───── */

  const contactName = (c: UnifiedContact) => [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";

  /* ───── Render ───── */

  // ═══ PROFILE VIEW ═══
  if (viewContact) {
    const c = viewContact;
    // Refresh contact data from list
    const fresh = contacts.find((x) => x.email === c.email);
    if (fresh && fresh !== c) {
      // silently update
    }
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <button onClick={() => setViewContact(null)} className="flex items-center gap-2 text-warm-500 hover:text-warm-800 text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Torna alla lista
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
          <div className="bg-gradient-to-r from-warm-800 to-warm-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-bold">
                {(c.firstName?.[0] || c.email[0]).toUpperCase()}{(c.lastName?.[0] || "").toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{contactName(c)}</h1>
                <p className="text-white/70 text-sm">{c.email}</p>
                {c.profile && <p className="text-white/50 text-xs mt-0.5">{c.profile}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditContact(c)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  <Pencil size={14} /> Modifica
                </button>
                <button onClick={() => { setSelected(new Set([c.email])); setShowEmailChoice(true); setSendResult(null); }}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  <Mail size={14} /> Email
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Tags */}
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {c.tags.map((t) => <span key={t.id} className="text-xs font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: t.color }}>{t.name}</span>)}
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoSection title="Informazioni personali" icon={<User size={16} />}>
                <InfoRow label="Nome" value={c.firstName} />
                <InfoRow label="Cognome" value={c.lastName} />
                <InfoRow label="Email" value={c.email} />
                <InfoRow label="Telefono" value={c.phone} />
                <InfoRow label="Profilo" value={c.profile} />
              </InfoSection>

              <InfoSection title="Azienda" icon={<Building2 size={16} />}>
                <InfoRow label="Azienda" value={c.company} />
                <InfoRow label="Website" value={c.website} isLink />
              </InfoSection>

              <InfoSection title="Indirizzo" icon={<MapPin size={16} />}>
                <InfoRow label="Indirizzo" value={c.address} />
                <InfoRow label="Città" value={c.city} />
                <InfoRow label="CAP" value={c.zip} />
                <InfoRow label="Provincia" value={c.province} />
                <InfoRow label="Paese" value={c.country} />
              </InfoSection>

              <InfoSection title="Altro" icon={<StickyNote size={16} />}>
                <InfoRow label="Origine" value={c.source === "entrambi" ? "Newsletter + Evento" : c.source === "newsletter" ? "Newsletter" : "Evento"} />
                <InfoRow label="Iscritto il" value={fmtDateFull(c.createdAt)} />
                {c.updatedAt && <InfoRow label="Aggiornato" value={fmtDateFull(c.updatedAt)} />}
                <InfoRow label="Privacy" value={c.subscriberId ? "Accettata" : "—"} />
                {c.notes && (
                  <div className="mt-2">
                    <span className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider">Note</span>
                    <p className="text-sm text-warm-700 mt-1 whitespace-pre-wrap">{c.notes}</p>
                  </div>
                )}
              </InfoSection>
            </div>
          </div>
        </div>

        {/* Edit/email modals still accessible */}
        {renderEditModal()}
        {renderEmailChoiceModal()}
        {renderTemplateModal()}
        {renderSimpleEmailModal()}
      </div>
    );
  }

  /* ═══ LIST VIEW ═══ */
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Utenti</h1>
          <p className="text-sm text-warm-500 mt-1">
            {contacts.length} contatti totali &middot; {eventRegs.length} registrazioni evento ({checkedInCount} check-in)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEventoDetail && selected.size > 0 ? (
            <>
              <button onClick={openTemplateModal} className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors">
                <FileText size={14} /> Template email ({selected.size})
              </button>
              <button onClick={() => { setShowSimpleEmail(true); setSendResult(null); setEmailSubject(""); setEmailBody(""); }}
                className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
                <Mail size={14} /> Email semplice
              </button>
              <button onClick={() => setShowTagAssign(true)} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors" title="Assegna tag"><Tag size={14} /></button>
              <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors" title="Elimina"><Trash2 size={14} /></button>
            </>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setShowImport(true); setImportResult(null); }}
                className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
                <Upload size={14} /> Importa
              </button>
              {isEventoDetail && (
                <button onClick={() => window.open("/api/event-registrations?format=csv", "_blank")}
                  className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
                  <Download size={16} /> Esporta CSV
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200 overflow-x-auto scrollbar-hidden">
        {tabItems.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${activeTab === tab.key ? "border-current" : "border-transparent text-warm-400 hover:text-warm-600"}`}
            style={activeTab === tab.key ? { borderColor: tab.color, color: tab.color } : undefined}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />
            {tab.label}
            <span className="text-[10px] font-semibold bg-warm-100 text-warm-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
        <button onClick={() => setShowNewTag(true)} className="flex items-center px-3 py-3 text-warm-400 hover:text-warm-600 transition-colors border-b-2 border-transparent -mb-px shrink-0" title="Nuovo tag"><Plus size={14} /></button>
      </div>

      {/* Search + event sub-filter */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per nome, email, azienda, città..."
            className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none" />
        </div>
        {isEventoDetail && (
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value as EventFilter)}
            className="border border-warm-300 rounded-lg px-3 py-2.5 text-sm focus:border-warm-800 focus:outline-none bg-white">
            <option value="all">Tutti ({eventRegs.length})</option>
            <option value="participated">Partecipanti ({eventRegs.filter((r) => r.checkedIn).length})</option>
            <option value="not_participated">Non partecipanti ({eventRegs.filter((r) => !r.checkedIn).length})</option>
          </select>
        )}
      </div>

      {/* Content */}
      {(contactsLoading || eventLoading) ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>
      ) : isEventoDetail ? (
        /* ═══ Evento detail ═══ */
        filteredEvent.length === 0 ? <EmptyState text="Nessuna registrazione" /> : (
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-warm-200 bg-warm-50">
                <Th>Nome</Th><Th>Email</Th><Th className="hidden md:table-cell">Profilo</Th><Th className="hidden lg:table-cell">Luogo</Th><Th className="text-center">Check-in</Th><Th className="hidden md:table-cell">Data</Th><Th className="w-12" />
              </tr></thead>
              <tbody className="divide-y divide-warm-100">
                {filteredEvent.map((r) => (
                  <tr key={r.id} className="hover:bg-warm-50/50">
                    <td className="px-4 py-3"><div className="font-medium text-warm-800">{r.firstName} {r.lastName}</div><div className="text-[10px] text-warm-400 font-mono">{r.qrCode.slice(0, 8)}...</div></td>
                    <td className="px-4 py-3 text-warm-600">{r.email}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{r.profile ? <span className="text-[10px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded">{r.profile}</span> : "\u2014"}</td>
                    <td className="px-4 py-3 text-warm-600 hidden lg:table-cell">{r.city}, {r.country}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleCheckIn(r.id, !r.checkedIn)}>
                        {r.checkedIn ? <CheckCircle2 size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-warm-300 hover:text-warm-500 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteEvent(r.id)} className="text-warm-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ═══ Unified contacts ═══ */
        filteredContacts.length === 0 ? <EmptyState text={activeTab !== "all" ? "Nessun utente con questo tag" : "Nessun contatto"} /> : (
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-warm-200 bg-warm-50">
                <th className="text-left px-4 py-3 w-10"><input type="checkbox" checked={selected.size === currentList.length && currentList.length > 0} onChange={selectAll} className="accent-warm-800" /></th>
                <Th>Nome</Th><Th>Email</Th><Th className="hidden md:table-cell">Città</Th><Th className="hidden md:table-cell">Tag</Th><Th className="hidden lg:table-cell">Origine</Th><Th className="w-36" />
              </tr></thead>
              <tbody className="divide-y divide-warm-100">
                {filteredContacts.map((c) => (
                  <tr key={c.email} className={`hover:bg-warm-50/50 transition-colors ${selected.has(c.email) ? "bg-warm-50" : ""}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(c.email)} onChange={() => toggleSelect(c.email)} className="accent-warm-800" /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-warm-800">{contactName(c)}</div>
                      {c.company && <div className="text-[10px] text-warm-400">{c.company}</div>}
                    </td>
                    <td className="px-4 py-3 text-warm-600 text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-warm-600 text-xs hidden md:table-cell">
                      {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => <span key={t.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>{t.name}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${c.source === "entrambi" ? "bg-purple-100 text-purple-600" : c.source === "newsletter" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                        {c.source === "entrambi" ? "Newsletter + Evento" : c.source === "newsletter" ? "Newsletter" : "Evento"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewContact(c)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Visualizza profilo"><Eye size={15} /></button>
                        <button onClick={() => openEditContact(c)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica"><Pencil size={15} /></button>
                        <button onClick={() => { setSelected(new Set([c.email])); setShowEmailChoice(true); setSendResult(null); }} className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors" title="Email"><Mail size={15} /></button>
                        <button onClick={() => handleDeleteContact(c.email)} className="p-1.5 text-warm-400 hover:text-red-500 transition-colors" title="Elimina"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ═══ Modals ═══ */}
      {renderTemplateModal()}
      {renderSimpleEmailModal()}
      {renderEmailChoiceModal()}
      {renderEditModal()}

      {/* ═══ Tag Assign ═══ */}
      {showTagAssign && (
        <Modal onClose={() => setShowTagAssign(false)} title="Assegna Tag" subtitle={`${selected.size} selezionati`} small>
          <div className="space-y-2 mb-4">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between">
                <button onClick={() => assignTag(tag.id)} className="flex items-center gap-2 text-sm text-warm-700 hover:text-warm-900 flex-1 py-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}
                </button>
                <button onClick={() => removeTag(tag.id)} className="text-[10px] text-warm-400 hover:text-red-500 px-2 py-1">rimuovi</button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); createTag(); }} className="flex gap-2">
            <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nuovo tag..." className="flex-1 border border-warm-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <button type="submit" disabled={!newTagName.trim()} className="bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Crea</button>
          </form>
        </Modal>
      )}

      {/* ═══ Import ═══ */}
      {showImport && (
        <Modal onClose={() => setShowImport(false)} title="Importa Utenti" subtitle="Carica un file CSV">
          <div className="space-y-4">
            <div className="bg-warm-50 rounded-lg p-4">
              <p className="text-xs text-warm-600 font-semibold mb-2">Colonne supportate:</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-warm-500">
                <span><b>Nome</b> (nome / firstname)</span><span><b>Cognome</b> (cognome / lastname)</span>
                <span><b>Email</b> (email / mail) *</span><span><b>Azienda</b> (azienda / company)</span>
                <span><b>Telefono</b> (telefono / phone)</span><span><b>Profilo</b> (profilo / profile / ruolo)</span>
                <span><b>Indirizzo</b> (indirizzo / address)</span><span><b>Città</b> (città / city)</span>
                <span><b>CAP</b> (cap / zip)</span><span><b>Provincia</b> (provincia / province)</span>
                <span><b>Paese</b> (paese / country)</span><span><b>Website</b> (sito / website / url)</span>
                <span><b>Note</b> (note / notes)</span><span><b>Tag</b> (tag) separati da virgola</span>
              </div>
            </div>
            <button onClick={downloadTemplate} type="button" className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 underline"><Download size={14} /> Scarica template CSV</button>
            <div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleImport} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-warm-300 rounded-xl py-6 text-sm font-medium text-warm-500 hover:border-warm-400 hover:text-warm-600 transition-colors disabled:opacity-50">
                {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {importing ? "Importazione..." : "Seleziona file CSV"}
              </button>
            </div>
            {importResult && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Importati: {importResult.imported} &middot; Saltati: {importResult.skipped} &middot; Tag: {importResult.tagged}</div>}
          </div>
        </Modal>
      )}

      {/* ═══ New Tag ═══ */}
      {showNewTag && !showTagAssign && (
        <Modal onClose={() => setShowNewTag(false)} title="Nuovo Tag" small>
          <form onSubmit={(e) => { e.preventDefault(); createTag(); }} className="flex gap-2">
            <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nome tag..." autoFocus className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none" />
            <button type="submit" disabled={!newTagName.trim()} className="bg-warm-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">Crea</button>
          </form>
        </Modal>
      )}
    </div>
  );

  /* ═══ Render helpers for modals ═══ */

  function renderEmailChoiceModal() {
    if (!showEmailChoice) return null;
    return (
      <Modal onClose={() => setShowEmailChoice(false)} title="Invia Email" subtitle={`${selected.size} destinatario`} small>
        <div className="space-y-3">
          <button onClick={() => { setShowEmailChoice(false); openTemplateModal(); }}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-warm-200 hover:border-warm-400 hover:bg-warm-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-warm-100 flex items-center justify-center shrink-0"><FileText size={18} className="text-warm-600" /></div>
            <div className="flex-1"><div className="font-medium text-warm-800 text-sm">Template email</div><div className="text-xs text-warm-500">Scegli un template predefinito</div></div>
          </button>
          <button onClick={() => { setShowEmailChoice(false); setShowSimpleEmail(true); setSendResult(null); setEmailSubject(""); setEmailBody(""); }}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-warm-200 hover:border-warm-400 hover:bg-warm-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-warm-100 flex items-center justify-center shrink-0"><Mail size={18} className="text-warm-600" /></div>
            <div className="flex-1"><div className="font-medium text-warm-800 text-sm">Email semplice</div><div className="text-xs text-warm-500">Scrivi oggetto e messaggio personalizzato</div></div>
          </button>
        </div>
      </Modal>
    );
  }

  function renderTemplateModal() {
    if (!showTemplateModal) return null;
    return (
      <Modal onClose={() => setShowTemplateModal(false)} title="Scegli Template Email" subtitle={`${selected.size} destinatari`}>
        {templatesLoading ? <div className="py-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-warm-400" /></div> : templates.length === 0 ? (
          <div className="py-10 text-center text-warm-500">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun template disponibile</p>
            <a href="/admin/email-templates/new" className="text-sm text-warm-700 underline mt-2 inline-block">Crea il primo</a>
          </div>
        ) : (
          <>
            {landingPages.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1.5">Tracking invito evento (opzionale)</label>
                <select value={templateLpId} onChange={(e) => setTemplateLpId(e.target.value)}
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none bg-white">
                  <option value="">Nessun tracking (email normale)</option>
                  {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.name} — con tracking invito</option>)}
                </select>
                <p className="text-[10px] text-purple-500 mt-1">Se selezioni un evento, il link nel template viene tracciato e l&apos;utente riceve il tag &quot;Invitato&quot;</p>
              </div>
            )}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {templates.map((t) => (
                <button key={t.id} onClick={() => sendWithTemplate(t.id)} disabled={sending}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-warm-200 hover:border-warm-400 hover:bg-warm-50 transition-colors text-left disabled:opacity-50">
                  <div className="w-10 h-10 rounded-lg bg-warm-100 flex items-center justify-center shrink-0"><FileText size={18} className="text-warm-600" /></div>
                  <div className="flex-1 min-w-0"><div className="font-medium text-warm-800 text-sm">{t.name}</div><div className="text-xs text-warm-500 truncate">{t.subject || "Nessun oggetto"}</div></div>
                  <Send size={16} className="text-warm-400 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
        {sendResult && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Inviate: {sendResult.sent} &middot; Fallite: {sendResult.failed}</div>}
        {sending && <div className="mt-4 flex items-center gap-2 text-warm-500 text-sm"><Loader2 size={16} className="animate-spin" /> Invio in corso...</div>}
      </Modal>
    );
  }

  function renderSimpleEmailModal() {
    if (!showSimpleEmail) return null;
    return (
      <Modal onClose={() => setShowSimpleEmail(false)} title="Email Semplice" subtitle={`${selected.size} destinatari`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto</label>
            <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Messaggio</label>
            <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
            <p className="text-[10px] text-warm-400 mt-1">La firma email viene aggiunta automaticamente.</p>
          </div>
        </div>
        {sendResult && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Inviate: {sendResult.sent} &middot; Fallite: {sendResult.failed}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowSimpleEmail(false)} className="px-4 py-2 text-sm text-warm-600">Annulla</button>
          <button onClick={sendSimpleEmail} disabled={sending} className="flex items-center gap-2 bg-warm-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sending ? "Invio..." : "Invia"}
          </button>
        </div>
      </Modal>
    );
  }

  function renderEditModal() {
    if (!showEditContact) return null;
    return (
      <Modal onClose={() => setShowEditContact(false)} title="Modifica Utente" wide>
        <div className="space-y-5">
          {/* Personal */}
          <fieldset>
            <legend className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={13} /> Informazioni personali</legend>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nome" value={editForm.firstName} onChange={(v) => setEditForm((p) => ({ ...p, firstName: v }))} />
              <FormField label="Cognome" value={editForm.lastName} onChange={(v) => setEditForm((p) => ({ ...p, lastName: v }))} />
              <FormField label="Email" value={editForm.email} onChange={(v) => setEditForm((p) => ({ ...p, email: v }))} type="email" required />
              <FormField label="Telefono" value={editForm.phone} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
              <FormField label="Profilo / Ruolo" value={editForm.profile} onChange={(v) => setEditForm((p) => ({ ...p, profile: v }))} className="col-span-2" />
            </div>
          </fieldset>

          {/* Company */}
          <fieldset>
            <legend className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 size={13} /> Azienda</legend>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Azienda" value={editForm.company} onChange={(v) => setEditForm((p) => ({ ...p, company: v }))} />
              <FormField label="Website" value={editForm.website} onChange={(v) => setEditForm((p) => ({ ...p, website: v }))} />
            </div>
          </fieldset>

          {/* Address */}
          <fieldset>
            <legend className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin size={13} /> Indirizzo</legend>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Indirizzo" value={editForm.address} onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} className="col-span-2" />
              <FormField label="Città" value={editForm.city} onChange={(v) => setEditForm((p) => ({ ...p, city: v }))} />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="CAP" value={editForm.zip} onChange={(v) => setEditForm((p) => ({ ...p, zip: v }))} />
                <FormField label="Provincia" value={editForm.province} onChange={(v) => setEditForm((p) => ({ ...p, province: v }))} />
              </div>
              <FormField label="Paese" value={editForm.country} onChange={(v) => setEditForm((p) => ({ ...p, country: v }))} className="col-span-2" />
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset>
            <legend className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-2"><StickyNote size={13} /> Note</legend>
            <textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
              className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" placeholder="Note interne..." />
          </fieldset>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-warm-100">
          <button onClick={() => setShowEditContact(false)} className="px-4 py-2 text-sm text-warm-600">Annulla</button>
          <button onClick={saveEditContact} disabled={editSaving} className="flex items-center gap-2 bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
            {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} {editSaving ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </Modal>
    );
  }

}

/* ───── Helpers ───── */

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider ${className}`}>{children}</th>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-20 text-warm-500"><Users size={48} className="mx-auto mb-4 opacity-30" /><p>{text}</p></div>;
}

function Modal({ children, onClose, title, subtitle, small, wide }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string; small?: boolean; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto ${small ? "max-w-sm" : wide ? "max-w-2xl" : "max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-lg font-semibold text-warm-900">{title}</h2>{subtitle && <p className="text-xs text-warm-500 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoSection({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <div className="bg-warm-50/50 rounded-xl p-5 border border-warm-100">
      <h3 className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-2">{icon} {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string | null | undefined; isLink?: boolean }) {
  if (!value) return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-warm-400">{label}</span>
      <span className="text-sm text-warm-300">—</span>
    </div>
  );
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-warm-400 shrink-0">{label}</span>
      {isLink ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-warm-700 hover:text-warm-900 underline truncate">{value}</a>
      ) : (
        <span className="text-sm text-warm-700 text-right">{value}</span>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", required, className = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none transition-colors" />
    </div>
  );
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtDateFull(d: string) { return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
