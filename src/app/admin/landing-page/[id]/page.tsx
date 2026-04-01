"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Send, Loader2, CheckCircle2, Settings2,
  Mail, ScanLine, Camera, AlertCircle, X, Save, Users, Download, Trash2,
  XCircle, ExternalLink,
} from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

/* ───── Types ───── */

interface FieldConfig {
  key: string;
  label: string;
  width: "50" | "70" | "100";
  enabled: boolean;
  order: number;
}

const DEFAULT_FORM_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "First Name", width: "50", enabled: true, order: 0 },
  { key: "lastName", label: "Last Name", width: "50", enabled: true, order: 1 },
  { key: "email", label: "Email", width: "100", enabled: true, order: 2 },
  { key: "profile", label: "Profile", width: "100", enabled: true, order: 3 },
  { key: "company", label: "Company", width: "100", enabled: false, order: 4 },
  { key: "phone", label: "Phone", width: "50", enabled: false, order: 5 },
  { key: "country", label: "Country or Region", width: "50", enabled: true, order: 6 },
  { key: "state", label: "State or Province", width: "50", enabled: true, order: 7 },
  { key: "city", label: "City", width: "50", enabled: true, order: 8 },
  { key: "zipCode", label: "ZIP", width: "50", enabled: true, order: 9 },
];

interface FormState {
  name: string; permalink: string; type: string;
  heroTitle: string; heroSubtitle: string; heroLocation: string; heroDescription: string;
  successTitle: string; successMessage: string; privacyLabel: string; marketingLabel: string;
  buttonLabel: string; bannerImage: string; logoImage: string;
  emailSubject: string; emailTitle: string; emailBody: string; isActive: boolean;
  emailTemplateId: string; signatureTemplateId: string;
  formFields: FieldConfig[];
}

interface EmailTpl { id: string; name: string; subject: string; previewHtml: string | null; }
interface SigTpl { id: string; name: string; }

interface ScanResult { success: boolean; alreadyCheckedIn?: boolean; error?: string; data?: { firstName: string; lastName: string; email: string; profile: string | null; checkedInAt: string | null; }; }

interface EventReg { id: string; firstName: string; lastName: string; email: string; profile: string | null; country: string; city: string; qrCode: string; checkedIn: boolean; checkedInAt: string | null; createdAt: string; }

type Tab = "config" | "email" | "registrations" | "scanner";

/* ───── Component ───── */

export default function LandingPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lpId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [form, setForm] = useState<FormState>({
    name: "", permalink: "", type: "evento",
    heroTitle: "", heroSubtitle: "", heroLocation: "", heroDescription: "",
    successTitle: "", successMessage: "", privacyLabel: "", marketingLabel: "",
    buttonLabel: "Register", bannerImage: "", logoImage: "",
    emailSubject: "", emailTitle: "", emailBody: "", isActive: true,
    emailTemplateId: "", signatureTemplateId: "",
    formFields: [...DEFAULT_FORM_FIELDS],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Email & signature templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTpl[]>([]);
  const [signatureTemplates, setSignatureTemplates] = useState<SigTpl[]>([]);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");

  // Registrations
  const [regs, setRegs] = useState<EventReg[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regFilter, setRegFilter] = useState<"all" | "checked" | "unchecked">("all");

  // Scanner
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ name: string; time: string; isNew: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test email
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/landing-page-config?admin=true&id=${lpId}`).then(r => r.json()),
      fetch("/api/email-templates").then(r => r.json()),
      fetch("/api/signature/templates").then(r => r.json()),
    ]).then(([lpRes, etRes, stRes]) => {
      if (lpRes.success && lpRes.data) {
        const lp = lpRes.data;
        let parsedFields = [...DEFAULT_FORM_FIELDS];
        if (lp.formFields) {
          try {
            const saved = JSON.parse(lp.formFields) as FieldConfig[];
            const savedKeys = new Set(saved.map((f: FieldConfig) => f.key));
            parsedFields = [
              ...saved,
              ...DEFAULT_FORM_FIELDS.filter(f => !savedKeys.has(f.key)),
            ].sort((a, b) => a.order - b.order);
          } catch { /* use defaults */ }
        }
        setForm({
          name: lp.name || "", permalink: lp.permalink || "", type: lp.type || "evento",
          heroTitle: lp.heroTitle || "", heroSubtitle: lp.heroSubtitle || "",
          heroLocation: lp.heroLocation || "", heroDescription: lp.heroDescription || "",
          successTitle: lp.successTitle || "", successMessage: lp.successMessage || "",
          privacyLabel: lp.privacyLabel || "", marketingLabel: lp.marketingLabel || "",
          buttonLabel: lp.buttonLabel || "Register", bannerImage: lp.bannerImage || "",
          logoImage: lp.logoImage || "", emailSubject: lp.emailSubject || "",
          emailTitle: lp.emailTitle || "", emailBody: lp.emailBody || "",
          isActive: lp.isActive,
          emailTemplateId: lp.emailTemplateId || "",
          signatureTemplateId: lp.signatureTemplateId || "",
          formFields: parsedFields,
        });
      }
      if (etRes.success) setEmailTemplates(etRes.data || []);
      if (stRes.success) setSignatureTemplates(stRes.data || []);
    }).finally(() => setLoading(false));
  }, [lpId]);

  const fetchRegs = () => {
    setRegsLoading(true);
    fetch(`/api/event-registrations?landingPageId=${lpId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRegs(d.data || []); })
      .finally(() => setRegsLoading(false));
  };

  useEffect(() => { if (activeTab === "registrations") fetchRegs(); }, [activeTab, lpId]);

  const updateField = (key: string, value: string | boolean) => { setForm((p) => ({ ...p, [key]: value })); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    const { formFields, emailTemplateId, signatureTemplateId, ...rest } = form;
    const res = await fetch("/api/landing-page-config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lpId, ...rest,
        formFields: JSON.stringify(formFields),
        emailTemplateId: emailTemplateId || null,
        signatureTemplateId: signatureTemplateId || null,
      }),
    });
    const d = await res.json();
    if (d.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else alert(d.error);
    setSaving(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    await fetch("/api/landing-page-config/test-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testEmail, emailSubject: form.emailSubject, emailTitle: form.emailTitle, emailBody: form.emailBody, bannerImage: form.bannerImage }),
    });
    setSendingTest(false);
  };

  // Check-in
  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    await fetch(`/api/event-registrations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkedIn }) });
    fetchRegs();
  };

  const handleDeleteReg = async (id: string) => {
    if (!confirm("Eliminare?")) return;
    await fetch(`/api/event-registrations/${id}`, { method: "DELETE" }); fetchRegs();
  };

  // Scanner
  const processQrCode = async (code: string) => {
    if (processing) return;
    setProcessing(true); setScanResult(null);
    try {
      const r = await fetch("/api/event-registrations/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qrCode: code.trim() }) });
      const data: ScanResult = await r.json();
      setScanResult(data);
      if (navigator.vibrate) { if (data.success && !data.alreadyCheckedIn) navigator.vibrate([100, 50, 100]); else navigator.vibrate([200]); }
      if (data.success && data.data) {
        setScanHistory((p) => [{ name: `${data.data!.firstName} ${data.data!.lastName}`, time: new Date().toLocaleTimeString("it-IT"), isNew: !data.alreadyCheckedIn }, ...p.slice(0, 29)]);
      }
      setTimeout(() => setScanResult(null), 4000);
    } catch { setScanResult({ success: false, error: "Errore di connessione" }); }
    setProcessing(false);
  };

  useEffect(() => {
    if (!scanning) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const qr = new Html5Qrcode("qr-reader");
      scanner = qr as unknown as typeof scanner;
      const container = document.getElementById("qr-reader");
      const w = container?.clientWidth || 300;
      const boxSize = Math.min(Math.floor(w * 0.65), 280);
      qr.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: boxSize, height: boxSize }, aspectRatio: 1 },
        (text) => processQrCode(text), () => {}
      ).then(() => {
        try {
          const v = document.querySelector("#qr-reader video") as HTMLVideoElement;
          if (v?.srcObject) { const t = (v.srcObject as MediaStream).getVideoTracks()[0]; const c = t.getCapabilities?.() as Record<string, unknown> | undefined; if (c?.focusMode) t.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {}); }
        } catch {}
      }).catch(() => setScanning(false));
    });
    return () => { if (scanner) { scanner.stop().catch(() => {}); scanner.clear(); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode("qr-file-reader");
      const decoded = await qr.scanFile(file, true);
      processQrCode(decoded); qr.clear();
    } catch { setScanResult({ success: false, error: "QR non trovato nell'immagine" }); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredRegs = regFilter === "all" ? regs : regFilter === "checked" ? regs.filter((r) => r.checkedIn) : regs.filter((r) => !r.checkedIn);
  const checkedCount = regs.filter((r) => r.checkedIn).length;

  if (loading) return <div className="p-8 flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>;

  const TABS: { key: Tab; label: string; icon: typeof Settings2; badge?: number }[] = [
    { key: "config", label: "Configurazione", icon: Settings2 },
    { key: "email", label: "Email", icon: Mail },
    { key: "registrations", label: "Registrazioni", icon: Users, badge: regs.length },
    { key: "scanner", label: "Scanner", icon: ScanLine },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/admin/landing-page")} className="text-warm-400 hover:text-warm-600"><ArrowLeft size={20} /></button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-warm-900 truncate">{form.name || "Landing Page"}</h1>
            <p className="text-xs text-warm-500 font-mono">/{form.permalink}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href={`/${form.permalink}`} target="_blank" className="flex items-center gap-1.5 text-sm text-warm-600 hover:text-warm-800"><ExternalLink size={14} /> Anteprima</a>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? "Salvataggio..." : saved ? "Salvato" : "Salva"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? "border-warm-800 text-warm-900" : "border-transparent text-warm-400 hover:text-warm-600"}`}>
            <tab.icon size={16} /> {tab.label}
            {tab.badge !== undefined && <span className="text-[10px] bg-warm-100 text-warm-500 px-1.5 py-0.5 rounded-full">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ═══ Config Tab ═══ */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* 1. Impostazioni generali */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Impostazioni generali</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome</label>
                <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Permalink</label>
                <input type="text" value={form.permalink} onChange={(e) => updateField("permalink", e.target.value.toLowerCase().replace(/[^\w-]/g, ""))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                <option value="evento">Evento</option><option value="promo">Promozionale</option><option value="custom">Personalizzata</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => updateField("isActive", e.target.checked)} className="accent-warm-800" /> Attiva
              </label>
            </div>
          </div>

          {/* 2. Immagini */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Immagini</h3>
            <ImageUploadField label="Banner" value={form.bannerImage} onChange={(url) => updateField("bannerImage", url)} onRemove={() => updateField("bannerImage", "")} purpose="general" folder="landing-page" />
            <ImageUploadField label="Logo" value={form.logoImage} onChange={(url) => updateField("logoImage", url)} onRemove={() => updateField("logoImage", "")} purpose="general" folder="landing-page" />
          </div>

          {/* 3. Contenuti Hero */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Contenuti Hero</h3>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo</label><input type="text" value={form.heroTitle} onChange={(e) => updateField("heroTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Sottotitolo</label><input type="text" value={form.heroSubtitle} onChange={(e) => updateField("heroSubtitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Location</label><textarea value={form.heroLocation} onChange={(e) => updateField("heroLocation", e.target.value)} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione</label><textarea value={form.heroDescription} onChange={(e) => updateField("heroDescription", e.target.value)} rows={3} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
          </div>

          {/* 4. Campi del form */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-800">Campi del form</h3>
              <p className="text-[10px] text-warm-400">Riordina, scegli la larghezza</p>
            </div>
            <div className="space-y-2">
              {form.formFields.sort((a, b) => a.order - b.order).map((field, idx) => (
                <div key={field.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${field.enabled ? "border-warm-200 bg-white" : "border-warm-100 bg-warm-50 opacity-60"}`}>
                  <div className="flex flex-col gap-0.5">
                    <button type="button" disabled={idx === 0} onClick={() => {
                      const fields = [...form.formFields].sort((a, b) => a.order - b.order);
                      if (idx > 0) { const t = fields[idx].order; fields[idx].order = fields[idx - 1].order; fields[idx - 1].order = t; }
                      setForm(p => ({ ...p, formFields: fields })); setSaved(false);
                    }} className="text-warm-400 hover:text-warm-600 disabled:opacity-30 text-xs leading-none">&uarr;</button>
                    <button type="button" disabled={idx === form.formFields.length - 1} onClick={() => {
                      const fields = [...form.formFields].sort((a, b) => a.order - b.order);
                      if (idx < fields.length - 1) { const t = fields[idx].order; fields[idx].order = fields[idx + 1].order; fields[idx + 1].order = t; }
                      setForm(p => ({ ...p, formFields: fields })); setSaved(false);
                    }} className="text-warm-400 hover:text-warm-600 disabled:opacity-30 text-xs leading-none">&darr;</button>
                  </div>
                  <input type="checkbox" checked={field.enabled} onChange={(e) => {
                    const fields = form.formFields.map(f => f.key === field.key ? { ...f, enabled: e.target.checked } : f);
                    setForm(p => ({ ...p, formFields: fields })); setSaved(false);
                  }} className="accent-warm-800 w-4 h-4" />
                  <input type="text" value={field.label} onChange={(e) => {
                    const fields = form.formFields.map(f => f.key === field.key ? { ...f, label: e.target.value } : f);
                    setForm(p => ({ ...p, formFields: fields })); setSaved(false);
                  }} className="flex-1 border border-warm-200 rounded px-3 py-1.5 text-sm focus:outline-none min-w-0" />
                  <span className="text-[10px] text-warm-400 font-mono w-16 text-right shrink-0">{field.key}</span>
                  <div className="flex gap-1 shrink-0">
                    {(["50", "70", "100"] as const).map(w => (
                      <button key={w} type="button" onClick={() => {
                        const fields = form.formFields.map(f => f.key === field.key ? { ...f, width: w } : f);
                        setForm(p => ({ ...p, formFields: fields })); setSaved(false);
                      }} className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${field.width === w ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-500 hover:bg-warm-200"}`}>
                        {w}%
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Successo */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Pagina di successo</h3>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo pulsante form</label><input type="text" value={form.buttonLabel} onChange={(e) => updateField("buttonLabel", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo successo</label><input type="text" value={form.successTitle} onChange={(e) => updateField("successTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Messaggio successo</label><textarea value={form.successMessage} onChange={(e) => updateField("successMessage", e.target.value)} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" placeholder="Testo opzionale sotto il titolo" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Privacy label</label><textarea value={form.privacyLabel} onChange={(e) => updateField("privacyLabel", e.target.value)} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Marketing label</label><input type="text" value={form.marketingLabel} onChange={(e) => updateField("marketingLabel", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
          </div>
        </div>
      )}

      {/* ═══ Email Tab ═══ */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Template email */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Template Email</h3>
            <p className="text-xs text-warm-500">Scegli il template che verr&agrave; inviato con il QR code dopo la registrazione.</p>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Template</label>
              <select value={form.emailTemplateId} onChange={(e) => {
                updateField("emailTemplateId", e.target.value);
                const tpl = emailTemplates.find(t => t.id === e.target.value);
                setEmailPreviewHtml(tpl?.previewHtml || "");
              }} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                <option value="">-- Nessun template (usa titolo/corpo personalizzato) --</option>
                {emailTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.subject ? `— ${t.subject}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Preview del template selezionato */}
            {form.emailTemplateId && (() => {
              const tpl = emailTemplates.find(t => t.id === form.emailTemplateId);
              return tpl?.previewHtml ? (
                <div className="border border-warm-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-warm-50 text-xs text-warm-500 font-medium border-b border-warm-200">Anteprima template</div>
                  <iframe srcDoc={tpl.previewHtml} className="w-full h-[300px] bg-white" title="Email preview" />
                </div>
              ) : null;
            })()}
          </div>

          {/* Fallback: campi manuali (se nessun template scelto) */}
          {!form.emailTemplateId && (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-warm-800">Contenuto email personalizzato</h3>
              <p className="text-xs text-warm-500">Questi campi vengono usati solo se non selezioni un template sopra.</p>
              <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo email</label><input type="text" value={form.emailTitle} onChange={(e) => updateField("emailTitle", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Corpo email</label><textarea value={form.emailBody} onChange={(e) => updateField("emailBody", e.target.value)} rows={5} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" /></div>
            </div>
          )}

          {/* Oggetto email (sempre visibile) */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Oggetto email</h3>
            <div><label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto</label><input type="text" value={form.emailSubject} onChange={(e) => updateField("emailSubject", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" placeholder="Es. Registrazione confermata — Milan Design Week 2026" /></div>
          </div>

          {/* Firma email */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Firma Email</h3>
            <p className="text-xs text-warm-500">La firma verr&agrave; inserita in fondo all&apos;email, dopo il QR code.</p>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Template firma</label>
              <select value={form.signatureTemplateId} onChange={(e) => updateField("signatureTemplateId", e.target.value)} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                <option value="">-- Firma di default (utente SMTP) --</option>
                {signatureTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Test email */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Invia email di prova</h3>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="email@esempio.com" className="flex-1 border border-warm-300 rounded-lg px-4 py-2 text-sm focus:outline-none" />
              <button onClick={handleSendTest} disabled={sendingTest || !testEmail} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 disabled:opacity-50">
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Invia prova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Registrations Tab ═══ */}
      {activeTab === "registrations" && (
        <div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="flex gap-1">
              {(["all", "checked", "unchecked"] as const).map((f) => (
                <button key={f} onClick={() => setRegFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${regFilter === f ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-600 hover:bg-warm-200"}`}>
                  {f === "all" ? `Tutti (${regs.length})` : f === "checked" ? `Check-in (${checkedCount})` : `Non check-in (${regs.length - checkedCount})`}
                </button>
              ))}
            </div>
            <button onClick={() => window.open(`/api/event-registrations?landingPageId=${lpId}&format=csv`, "_blank")} className="flex items-center gap-1.5 text-xs text-warm-600 hover:text-warm-800"><Download size={14} /> CSV</button>
          </div>

          {regsLoading ? <div className="py-10 text-center"><Loader2 size={20} className="animate-spin mx-auto text-warm-400" /></div> : filteredRegs.length === 0 ? (
            <div className="text-center py-16 text-warm-500"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nessuna registrazione</p></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-warm-200 bg-warm-50">
                  <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase hidden md:table-cell">Luogo</th>
                  <th className="text-center px-4 py-3 font-semibold text-warm-600 text-xs uppercase">Check-in</th>
                  <th className="w-12" />
                </tr></thead>
                <tbody className="divide-y divide-warm-100">
                  {filteredRegs.map((r) => (
                    <tr key={r.id} className="hover:bg-warm-50/50">
                      <td className="px-4 py-3 font-medium text-warm-800">{r.firstName} {r.lastName}</td>
                      <td className="px-4 py-3 text-warm-600 text-xs">{r.email}</td>
                      <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">{r.city}, {r.country}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleCheckIn(r.id, !r.checkedIn)}>
                          {r.checkedIn ? <CheckCircle2 size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-warm-300 hover:text-warm-500 mx-auto" />}
                        </button>
                      </td>
                      <td className="px-4 py-3"><button onClick={() => handleDeleteReg(r.id)} className="text-warm-400 hover:text-red-500"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Scanner Tab ═══ */}
      {activeTab === "scanner" && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-warm-900 mb-1">Scansiona QR Code</h2>
            <p className="text-xs text-warm-500 mb-4">Scansiona il QR code degli invitati per il check-in.</p>

            <div className="mb-4">
              {scanning ? (
                <div>
                  <div id="qr-reader" className="rounded-lg overflow-hidden mb-3 w-full max-w-[400px] mx-auto" />
                  <div className="text-center">
                    <button onClick={() => setScanning(false)} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-warm-600 bg-warm-100 rounded-lg hover:bg-warm-200 active:bg-warm-300">
                      <X size={16} /> Chiudi fotocamera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => { setScanResult(null); setScanning(true); }} className="flex items-center justify-center gap-3 bg-warm-800 text-white py-5 sm:py-4 rounded-lg text-base sm:text-sm font-medium hover:bg-warm-900 active:bg-warm-950">
                    <Camera size={22} /> Scansiona con fotocamera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 bg-warm-100 text-warm-700 py-5 sm:py-4 rounded-lg text-base sm:text-sm font-medium hover:bg-warm-200 active:bg-warm-300">
                    <ScanLine size={22} /> Carica foto QR
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              <div id="qr-file-reader" className="hidden" />
            </div>

            <div className="border-t border-warm-200 pt-4">
              <form onSubmit={(e) => { e.preventDefault(); if (manualCode.trim()) { processQrCode(manualCode.trim()); setManualCode(""); } }} className="flex gap-2">
                <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Inserisci codice QR..." className="flex-1 border border-warm-300 rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none font-mono" />
                <button type="submit" disabled={processing || !manualCode.trim()} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-3 rounded-lg text-sm font-medium hover:bg-warm-200 disabled:opacity-50 shrink-0">
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />} OK
                </button>
              </form>
            </div>
          </div>

          {scanResult && (
            <div className={`rounded-xl shadow-sm border p-4 mb-4 ${!scanResult.success ? "bg-red-50 border-red-200" : scanResult.alreadyCheckedIn ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-start gap-3">
                {!scanResult.success ? <AlertCircle size={28} className="text-red-500 shrink-0" /> : scanResult.alreadyCheckedIn ? <AlertCircle size={28} className="text-yellow-600 shrink-0" /> : <CheckCircle2 size={28} className="text-green-500 shrink-0" />}
                <div>
                  <p className="font-semibold text-base">{!scanResult.success ? "Non valido" : scanResult.alreadyCheckedIn ? "Già registrato" : "Check-in OK!"}</p>
                  <p className="text-sm mt-1 opacity-80">{!scanResult.success ? scanResult.error : `${scanResult.data?.firstName} ${scanResult.data?.lastName}`}</p>
                </div>
              </div>
            </div>
          )}

          {scanHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200">
              <div className="p-3 border-b border-warm-200"><h3 className="text-sm font-semibold text-warm-900">Ultimi check-in</h3></div>
              <div className="divide-y divide-warm-100 max-h-[40vh] overflow-y-auto">
                {scanHistory.map((item, i) => (
                  <div key={i} className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.isNew ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> : <AlertCircle size={16} className="text-yellow-500 shrink-0" />}
                      <span className="text-sm text-warm-800 truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-warm-400 shrink-0 ml-2">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
