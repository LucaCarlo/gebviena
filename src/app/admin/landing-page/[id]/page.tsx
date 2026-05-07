"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Send, Loader2, CheckCircle2, Settings2,
  Mail, ScanLine, Camera, AlertCircle, X, Save, Trash2,
  ExternalLink, Globe, Sparkles,
} from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

/* ───── Types ───── */

interface FieldConfig {
  key: string;
  label: string;
  width: "50" | "70" | "100";
  enabled: boolean;
  order: number;
  options?: string[];
}

interface EmailFooterConfig {
  showInstagram: boolean;
  showFacebook: boolean;
  showLinkedin: boolean;
  showPinterest: boolean;
  showWeb: boolean;
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  pinterestUrl: string;
  webUrl: string;
  line1: string;
  line2: string;
  line3: string;
}

const EMPTY_FOOTER: EmailFooterConfig = {
  showInstagram: true,
  showFacebook: true,
  showLinkedin: true,
  showPinterest: false,
  showWeb: true,
  instagramUrl: "https://www.instagram.com/gebruder_thonet_vienna/",
  facebookUrl: "https://www.facebook.com/GebruderThonetVienna",
  linkedinUrl: "https://www.linkedin.com/company/gebr-der-thonet-vienna-gmbh",
  pinterestUrl: "https://www.pinterest.com/gebruederthonetvienna/",
  webUrl: "https://www.gebruederthonetvienna.com",
  line1: "Gebrüder Thonet Vienna GmbH",
  line2: "www.gebruederthonetvienna.com",
  line3: "",
};

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
  name: string; permalink: string; type: string; template: string;
  heroTitle: string; heroSubtitle: string; heroLocation: string; heroDescription: string;
  successTitle: string; successMessage: string; privacyLabel: string; marketingLabel: string;
  buttonLabel: string; bannerImage: string; logoImage: string;
  emailSubject: string; emailTitle: string; emailBody: string; isActive: boolean;
  emailTemplateId: string;
  emailFooter: EmailFooterConfig;
  formFields: FieldConfig[];
  customConfig: SvenditaCustomConfig;
}

// Testi specifici landing svendita — usato solo se template === "svendita"
interface SvenditaCustomConfig {
  navLabelActive: string;
  navLabelShowroom: string;
  navLabelContatti: string;
  navLinkShowroom: string;
  navLinkContatti: string;
  eyebrow: string;
  block1Title: string; block1Lines: string; block1HighlightPrefix: string; block1HighlightStrong: string; block1Period: string;
  block2Title: string; block2Lines: string; block2HighlightPrefix: string; block2HighlightStrong: string; block2Period: string;
  longDescription: string;
  formCardTitle: string;
  formCardSubtitle: string;
  successCardTitle: string;
  successCardMessage: string;
  disclaimer: string;
}

const EMPTY_SVENDITA: SvenditaCustomConfig = {
  navLabelActive: "Vendita Speciale",
  navLabelShowroom: "Showroom",
  navLabelContatti: "Contatti",
  navLinkShowroom: "/",
  navLinkContatti: "/contatti/richiesta-info",
  eyebrow: "Vendita Speciale",
  block1Title: "Online",
  block1Lines: "Accesso su registrazione\nSelezione disponibile fino a esaurimento",
  block1HighlightPrefix: "Sconti fino al ",
  block1HighlightStrong: "40%",
  block1Period: "Dal 15 Maggio al 30 Giugno 2026",
  block2Title: "Showroom Torino",
  block2Lines: "Via Foggia 23H\nAccesso diretto in showroom\nPezzi unici da fine serie, shooting e fiere",
  block2HighlightPrefix: "Sconti fino al ",
  block2HighlightStrong: "70%",
  block2Period: "Dal 15 Maggio al 30 Giugno 2026",
  longDescription: "La Vendita Speciale nasce da un processo di ottimizzazione...\n\nQuesto percorso ci permette di rendere disponibili una selezione di prodotti a condizioni dedicate, attraverso due esperienze distinte:\n\n- **online**, con articoli disponibili in quantità limitata\n- **offline**, con una selezione esclusiva di pezzi unici e fuori produzione\n\nDue modalità diverse, unite dalla stessa attenzione per qualità e ricerca.",
  formCardTitle: "Richiedi Accesso",
  formCardSubtitle: "Registrati per accedere alla vendita speciale online.",
  successCardTitle: "Richiesta inviata",
  successCardMessage: "Ti abbiamo inviato un'email di conferma all'indirizzo che ci hai fornito. A breve riceverai le istruzioni per accedere alla vendita speciale online.",
  disclaimer: "L'accesso online è riservato agli utenti registrati.\nI prodotti disponibili online e in showroom differiscono per tipologia e disponibilità.\nLa registrazione non garantisce disponibilità sugli articoli.",
};

interface EmailTpl { id: string; name: string; subject: string; previewHtml: string | null; }

interface ScanResult { success: boolean; alreadyCheckedIn?: boolean; error?: string; data?: { firstName: string; lastName: string; email: string; profile: string | null; checkedInAt: string | null; }; }

type Tab = "config" | "email" | "scanner";

/* ───── Bottone AI inline ───── */
function AIButton({ busy, onClick, title }: { busy?: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title || "Traduci questo campo con AI"}
      className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 disabled:opacity-30"
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      AI
    </button>
  );
}

/* ───── Field svendita (top-level: stable identity, mantiene il focus) ───── */
function SvenditaField({
  label,
  value,
  onChange,
  hint,
  multi,
  rows = 4,
  aiVisible,
  aiBusy,
  onAI,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multi?: boolean;
  rows?: number;
  aiVisible?: boolean;
  aiBusy?: boolean;
  onAI?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">{label}</label>
        {aiVisible && onAI && (
          <button
            type="button"
            onClick={onAI}
            disabled={aiBusy}
            title="Traduci questo campo con AI"
            className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 disabled:opacity-30"
          >
            {aiBusy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            AI
          </button>
        )}
      </div>
      {multi ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full border border-warm-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-warm-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-warm-500"
        />
      )}
      {hint && <p className="text-[10px] text-warm-500 mt-1">{hint}</p>}
    </div>
  );
}

/* ───── Component ───── */

export default function LandingPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lpId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [form, setForm] = useState<FormState>({
    name: "", permalink: "", type: "evento", template: "default",
    heroTitle: "", heroSubtitle: "", heroLocation: "", heroDescription: "",
    successTitle: "", successMessage: "", privacyLabel: "", marketingLabel: "",
    buttonLabel: "Register", bannerImage: "", logoImage: "",
    emailSubject: "", emailTitle: "", emailBody: "", isActive: true,
    emailTemplateId: "",
    emailFooter: { ...EMPTY_FOOTER },
    formFields: [...DEFAULT_FORM_FIELDS],
    customConfig: { ...EMPTY_SVENDITA },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Email & signature templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTpl[]>([]);


  // Registrations
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

  // Traduzioni landing
  const [tlang, setTlang] = useState("it");
  const [languages, setLanguages] = useState<{ code: string; name: string; flag: string | null; isDefault: boolean; isActive: boolean }[]>([]);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [savingT, setSavingT] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [tToast, setTToast] = useState<string>("");
  const isT = tlang !== "it";

  // Carica lingue
  useEffect(() => {
    fetch("/api/languages").then(r => r.json()).then(d => {
      if (d.success) setLanguages(d.data.filter((l: { isActive: boolean }) => l.isActive));
    });
  }, []);

  // Carica translations esistenti
  useEffect(() => {
    if (!lpId) return;
    fetch(`/api/admin/translations/landing/${lpId}`).then(r => r.json()).then(d => {
      if (d.success) {
        const next: Record<string, Record<string, string>> = {};
        for (const t of d.data || []) {
          const m: Record<string, string> = {};
          for (const f of d.fields || []) {
            const v = (t as Record<string, unknown>)[f.key];
            m[f.key] = typeof v === "string" ? v : "";
          }
          next[t.languageCode] = m;
        }
        setTranslations(next);
      }
    });
  }, [lpId]);

  // Helper: legge il valore corrente in base alla lingua attiva
  const tval = (key: string, defaultVal: string): string => {
    if (!isT) return defaultVal;
    const v = translations[tlang]?.[key];
    return typeof v === "string" ? v : "";
  };
  // Helper: scrive il valore in base alla lingua attiva
  const tset = (key: string, value: string, onDefault: (v: string) => void) => {
    if (!isT) { onDefault(value); return; }
    setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), [key]: value } }));
    setSaved(false);
  };

  const flashTToast = (msg: string) => { setTToast(msg); setTimeout(() => setTToast(""), 3000); };

  const saveTranslation = async () => {
    if (!isT) return;
    setSavingT(true);
    try {
      const draft = translations[tlang] || {};
      const res = await fetch(`/api/admin/translations/landing/${lpId}/${tlang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "translated", isPublished: true }),
      });
      const d = await res.json();
      if (d.success) flashTToast(`Traduzione ${tlang.toUpperCase()} salvata`);
      else flashTToast(d.error || "Errore salvataggio traduzione");
    } finally {
      setSavingT(false);
    }
  };

  // Source text utilizzato per la traduzione AI di un campo (in IT)
  const srcText = (key: string): string => {
    // I campi del form principale
    const formMap: Record<string, string | undefined> = {
      heroTitle: form.heroTitle, heroSubtitle: form.heroSubtitle,
      buttonLabel: form.buttonLabel, privacyLabel: form.privacyLabel,
      marketingLabel: form.marketingLabel, successTitle: form.successTitle,
      successMessage: form.successMessage,
      emailSubject: form.emailSubject, emailTitle: form.emailTitle, emailBody: form.emailBody,
    };
    if (key in formMap) return formMap[key] || "";
    // Sotto-campi customConfig
    const cfg = form.customConfig as unknown as Record<string, string | undefined>;
    return cfg[key] || "";
  };

  // Stato bottone AI per-campo (solo uno alla volta busy per non saturare)
  const [aiBusyKey, setAiBusyKey] = useState<string>("");

  // Traduce un singolo campo via API AI e aggiorna i drafts della lingua attiva
  const translateOne = async (key: string) => {
    if (!isT) return;
    const sourceText = srcText(key);
    if (!sourceText.trim()) { flashTToast("Sorgente IT vuota"); return; }
    setAiBusyKey(key);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, fromLang: "it", toLang: tlang }),
      });
      const d = await res.json();
      if (d.success) {
        setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), [key]: d.translation } }));
        setSaved(false);
      } else {
        flashTToast(d.error || "Errore traduzione AI");
      }
    } catch {
      flashTToast("Errore di connessione");
    } finally {
      setAiBusyKey("");
    }
  };

  // Traduce la label di un singolo campo del form (memorizzato in formFieldLabels JSON)
  const translateOneFormLabel = async (fieldKey: string, sourceLabel: string) => {
    if (!isT || !sourceLabel.trim()) return;
    const aiKey = `__formLabel_${fieldKey}`;
    setAiBusyKey(aiKey);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceLabel, fromLang: "it", toLang: tlang }),
      });
      const d = await res.json();
      if (d.success) {
        const next = { ...parsedFormLabels, [fieldKey]: d.translation as string };
        setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), formFieldLabels: JSON.stringify(next) } }));
        setSaved(false);
      } else {
        flashTToast(d.error || "Errore traduzione AI");
      }
    } catch {
      flashTToast("Errore di connessione");
    } finally {
      setAiBusyKey("");
    }
  };

  // Helpers: parse/aggiorna formFieldLabels (JSON) all'interno della translation della lingua attiva
  const parsedFormLabels: Record<string, string> = (() => {
    try {
      const raw = translations[tlang]?.formFieldLabels;
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch { return {}; }
  })();
  const setFormLabel = (key: string, value: string) => {
    if (!isT) return;
    const next = { ...parsedFormLabels, [key]: value };
    setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), formFieldLabels: JSON.stringify(next) } }));
    setSaved(false);
  };

  const TRANSLATABLE_KEYS: { key: string; label: string }[] = [
    { key: "heroTitle", label: "Titolo hero" },
    { key: "heroSubtitle", label: "Sottotitolo hero" },
    { key: "buttonLabel", label: "Testo bottone" },
    { key: "privacyLabel", label: "Label privacy" },
    { key: "marketingLabel", label: "Label marketing" },
    { key: "successTitle", label: "Titolo successo" },
    { key: "successMessage", label: "Messaggio successo" },
    { key: "navLabelActive", label: "Nav attiva" },
    { key: "navLabelShowroom", label: "Nav Showroom" },
    { key: "navLabelContatti", label: "Nav Contatti" },
    { key: "eyebrow", label: "Eyebrow" },
    { key: "block1Title", label: "Blocco 1 — titolo" },
    { key: "block1Lines", label: "Blocco 1 — righe" },
    { key: "block1HighlightPrefix", label: "Blocco 1 — highlight prefisso" },
    { key: "block1HighlightStrong", label: "Blocco 1 — highlight grassetto" },
    { key: "block1Period", label: "Blocco 1 — periodo" },
    { key: "block2Title", label: "Blocco 2 — titolo" },
    { key: "block2Lines", label: "Blocco 2 — righe" },
    { key: "block2HighlightPrefix", label: "Blocco 2 — highlight prefisso" },
    { key: "block2HighlightStrong", label: "Blocco 2 — highlight grassetto" },
    { key: "block2Period", label: "Blocco 2 — periodo" },
    { key: "longDescription", label: "Descrizione lunga" },
    { key: "formCardTitle", label: "Form titolo card" },
    { key: "formCardSubtitle", label: "Form sottotitolo card" },
    { key: "successCardTitle", label: "Form titolo card successo" },
    { key: "successCardMessage", label: "Form messaggio card successo" },
    { key: "disclaimer", label: "Disclaimer" },
    { key: "emailSubject", label: "Email — oggetto" },
    { key: "emailTitle", label: "Email — titolo" },
    { key: "emailBody", label: "Email — corpo" },
  ];

  const translateAll = async () => {
    if (!isT) return;
    setTranslatingAll(true);
    for (const { key } of TRANSLATABLE_KEYS) {
      const txt = srcText(key);
      if (!txt.trim()) continue;
      const existing = translations[tlang]?.[key];
      if (existing && existing.trim()) continue; // non sovrascrive traduzioni esistenti
      try {
        const res = await fetch("/api/admin/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt, fromLang: "it", toLang: tlang }),
        });
        const d = await res.json();
        if (d.success) {
          setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), [key]: d.translation } }));
        }
      } catch { /* ignore single failure */ }
    }

    // Traduzione AI delle label dei form fields (memorizzate come JSON in formFieldLabels)
    const labelsDraft: Record<string, string> = { ...parsedFormLabels };
    let labelsChanged = false;
    for (const f of form.formFields.filter((ff) => ff.enabled)) {
      if (labelsDraft[f.key]?.trim()) continue; // non sovrascrive
      if (!f.label?.trim()) continue;
      try {
        const res = await fetch("/api/admin/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: f.label, fromLang: "it", toLang: tlang }),
        });
        const d = await res.json();
        if (d.success) { labelsDraft[f.key] = d.translation; labelsChanged = true; }
      } catch { /* ignore */ }
    }
    if (labelsChanged) {
      setTranslations((p) => ({ ...p, [tlang]: { ...(p[tlang] || {}), formFieldLabels: JSON.stringify(labelsDraft) } }));
    }

    setTranslatingAll(false);
    setSaved(false);
    flashTToast(`Traduzione AI completata. Premi "Salva traduzione" per persistere.`);
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/landing-page-config?admin=true&id=${lpId}`).then(r => r.json()),
      fetch("/api/email-templates").then(r => r.json()),
    ]).then(([lpRes, etRes]) => {
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
          template: lp.template || "default",
          heroTitle: lp.heroTitle || "", heroSubtitle: lp.heroSubtitle || "",
          heroLocation: lp.heroLocation || "", heroDescription: lp.heroDescription || "",
          successTitle: lp.successTitle || "", successMessage: lp.successMessage || "",
          privacyLabel: lp.privacyLabel || "", marketingLabel: lp.marketingLabel || "",
          buttonLabel: lp.buttonLabel || "Register", bannerImage: lp.bannerImage || "",
          logoImage: lp.logoImage || "", emailSubject: lp.emailSubject || "",
          emailTitle: lp.emailTitle || "", emailBody: lp.emailBody || "",
          isActive: lp.isActive,
          emailTemplateId: lp.emailTemplateId || "",
          emailFooter: lp.emailFooter ? (() => { try { return { ...EMPTY_FOOTER, ...JSON.parse(lp.emailFooter) }; } catch { return { ...EMPTY_FOOTER }; } })() : { ...EMPTY_FOOTER },
          formFields: parsedFields,
          customConfig: lp.customConfig ? (() => { try { return { ...EMPTY_SVENDITA, ...JSON.parse(lp.customConfig) }; } catch { return { ...EMPTY_SVENDITA }; } })() : { ...EMPTY_SVENDITA },
        });
      }
      if (etRes.success) setEmailTemplates(etRes.data || []);
    }).finally(() => setLoading(false));
  }, [lpId]);

  const updateField = (key: string, value: string | boolean) => { setForm((p) => ({ ...p, [key]: value })); setSaved(false); };
  const updateCustom = (key: keyof SvenditaCustomConfig, value: string) => {
    setForm((p) => ({ ...p, customConfig: { ...p.customConfig, [key]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { formFields, emailTemplateId, emailFooter, customConfig, ...rest } = form;
    const isSvendita = form.template === "svendita";
    const res = await fetch("/api/landing-page-config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lpId, ...rest,
        formFields: JSON.stringify(formFields),
        emailTemplateId: emailTemplateId || null,
        emailFooter: JSON.stringify(emailFooter),
        customConfig: isSvendita ? JSON.stringify(customConfig) : null,
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

  // Scanner
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [scanPaused, setScanPaused] = useState(false);
  const lastScannedRef = useRef<string>("");

  const processQrCode = async (code: string) => {
    const trimmed = code.trim();
    if (processing || scanPaused) return;
    // Ignore same QR scanned again within pause window
    if (trimmed === lastScannedRef.current) return;
    lastScannedRef.current = trimmed;
    setProcessing(true); setScanResult(null);
    try {
      const r = await fetch("/api/event-registrations/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qrCode: trimmed }) });
      const data: ScanResult = await r.json();
      setScanResult(data);
      if (navigator.vibrate) { if (data.success && !data.alreadyCheckedIn) navigator.vibrate([100, 50, 100]); else navigator.vibrate([200]); }
      if (data.success && data.data) {
        setScanHistory((p) => [{ name: `${data.data!.firstName} ${data.data!.lastName}`, time: new Date().toLocaleTimeString("it-IT"), isNew: !data.alreadyCheckedIn }, ...p.slice(0, 29)]);
      }

      // Pause scanner for 3 seconds after any result, then auto-resume
      setScanPaused(true);
      if (scannerRef.current) { try { await scannerRef.current.stop(); } catch {} }
      setTimeout(() => {
        setScanResult(null);
        setScanPaused(false);
        lastScannedRef.current = "";
        // Re-trigger scanning
        setScanning(false);
        setTimeout(() => setScanning(true), 100);
      }, 3000);
    } catch { setScanResult({ success: false, error: "Errore di connessione" }); }
    setProcessing(false);
  };

  useEffect(() => {
    if (!scanning || scanPaused) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const qr = new Html5Qrcode("qr-reader");
      scanner = qr as unknown as typeof scanner;
      scannerRef.current = scanner;
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
    return () => { if (scanner) { scanner.stop().catch(() => {}); scanner.clear(); scannerRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, scanPaused]);

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

  if (loading) return <div className="p-8 flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>;

  const TABS: { key: Tab; label: string; icon: typeof Settings2; badge?: number }[] = [
    { key: "config", label: "Configurazione", icon: Settings2 },
    { key: "email", label: "Email", icon: Mail },
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
          {/* Toolbar traduzioni */}
          {languages.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 uppercase tracking-wider shrink-0">
                <Globe size={14} /> Lingua
              </div>
              <select
                value={tlang}
                onChange={(e) => setTlang(e.target.value)}
                className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag ? `${l.flag} ` : ""}{l.name}{l.isDefault ? " (principale)" : ""}
                  </option>
                ))}
              </select>
              {isT && (
                <>
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
                    Stai modificando la traduzione <strong>{tlang.toUpperCase()}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={translateAll}
                    disabled={translatingAll}
                    className="flex items-center gap-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {translatingAll ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {translatingAll ? "Traduzione AI in corso..." : "Traduci tutto con AI"}
                  </button>
                  <button
                    type="button"
                    onClick={saveTranslation}
                    disabled={savingT}
                    className="flex items-center gap-1.5 text-xs bg-warm-800 hover:bg-warm-900 text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {savingT ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Salva traduzione {tlang.toUpperCase()}
                  </button>
                </>
              )}
              {tToast && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded">
                  {tToast}
                </span>
              )}
            </div>
          )}

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
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Tipo</label>
                <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                  <option value="evento">Evento</option><option value="promo">Promozionale</option><option value="custom">Personalizzata</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Layout pagina pubblica</label>
                <select value={form.template} onChange={(e) => updateField("template", e.target.value)} className="border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                  <option value="default">Default (form QR)</option>
                  <option value="svendita">Vendita Speciale (custom)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer self-end pb-2.5">
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Titolo</label>
                {isT && <AIButton busy={aiBusyKey === "heroTitle"} onClick={() => translateOne("heroTitle")} />}
              </div>
              <input type="text" value={tval("heroTitle", form.heroTitle)} onChange={(e) => tset("heroTitle", e.target.value, (v) => updateField("heroTitle", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Sottotitolo</label>
                {isT && <AIButton busy={aiBusyKey === "heroSubtitle"} onClick={() => translateOne("heroSubtitle")} />}
              </div>
              <input type="text" value={tval("heroSubtitle", form.heroSubtitle)} onChange={(e) => tset("heroSubtitle", e.target.value, (v) => updateField("heroSubtitle", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
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

          {/* 4b. Opzioni profilo */}
          {form.formFields.find(f => f.key === "profile" && f.enabled) && (() => {
            const DEFAULT_OPTS = ["Architect / Interior Designer", "Press", "Trade / Retailer", "Client / Collector", "Student", "Other"];
            const profileField = form.formFields.find(f => f.key === "profile");
            const currentOptions = profileField?.options?.length ? profileField.options : DEFAULT_OPTS;
            const updateProfileOptions = (newOptions: string[]) => {
              const fields = form.formFields.map(f => f.key === "profile" ? { ...f, options: newOptions } : f);
              setForm(p => ({ ...p, formFields: fields })); setSaved(false);
            };
            return (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-warm-800">Opzioni profilo</h3>
                <button type="button" onClick={() => {
                  updateProfileOptions([...currentOptions, ""]);
                }} className="text-xs text-warm-600 hover:text-warm-800 flex items-center gap-1">+ Aggiungi</button>
              </div>
              <div className="space-y-2">
                {currentOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={opt} onChange={(e) => {
                      const opts = [...currentOptions];
                      opts[i] = e.target.value;
                      updateProfileOptions(opts);
                    }} className="flex-1 border border-warm-200 rounded px-3 py-1.5 text-sm focus:outline-none" placeholder="Nome opzione..." />
                    <button type="button" onClick={() => {
                      const opts = [...currentOptions];
                      opts.splice(i, 1);
                      updateProfileOptions(opts);
                    }} className="text-warm-400 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          {/* 4c. Testi specifici landing "Accesso Svendita GTV" */}
          {form.template === "svendita" && (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-warm-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-warm-800">Testi landing — Accesso Svendita GTV</h3>
                  <p className="text-xs text-warm-500 mt-0.5">Tutti i testi della pagina pubblica sono modificabili da qui.</p>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-1">Header / nav</h4>
                <div className="grid grid-cols-3 gap-3">
                  <SvenditaField label="Voce attiva" value={tval("navLabelActive", form.customConfig.navLabelActive)} onChange={(v) => tset("navLabelActive", v, (vv) => updateCustom("navLabelActive", vv))} aiVisible={isT} aiBusy={aiBusyKey === "navLabelActive"} onAI={() => translateOne("navLabelActive")} />
                  <SvenditaField label="Voce 'Showroom'" value={tval("navLabelShowroom", form.customConfig.navLabelShowroom)} onChange={(v) => tset("navLabelShowroom", v, (vv) => updateCustom("navLabelShowroom", vv))} aiVisible={isT} aiBusy={aiBusyKey === "navLabelShowroom"} onAI={() => translateOne("navLabelShowroom")} />
                  <SvenditaField label="Voce 'Contatti'" value={tval("navLabelContatti", form.customConfig.navLabelContatti)} onChange={(v) => tset("navLabelContatti", v, (vv) => updateCustom("navLabelContatti", vv))} aiVisible={isT} aiBusy={aiBusyKey === "navLabelContatti"} onAI={() => translateOne("navLabelContatti")} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <SvenditaField label="Link 'Showroom' (non traducibile)" hint="URL o path (es. / per home, /showroom, https://...)" value={form.customConfig.navLinkShowroom} onChange={(v) => updateCustom("navLinkShowroom", v)} />
                  <SvenditaField label="Link 'Contatti' (non traducibile)" hint="URL o path (es. /contatti/richiesta-info)" value={form.customConfig.navLinkContatti} onChange={(v) => updateCustom("navLinkContatti", v)} />
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-2">Eyebrow sopra il titolo</h4>
                <SvenditaField label="Eyebrow" hint="Etichetta in alto, sopra il grande titolo (es. 'Vendita Speciale')" value={tval("eyebrow", form.customConfig.eyebrow)} onChange={(v) => tset("eyebrow", v, (vv) => updateCustom("eyebrow", vv))} aiVisible={isT} aiBusy={aiBusyKey === "eyebrow"} onAI={() => translateOne("eyebrow")} />
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-2">Blocco 1 — Online (icona globo)</h4>
                <div className="space-y-3">
                  <SvenditaField label="Titolo blocco" value={tval("block1Title", form.customConfig.block1Title)} onChange={(v) => tset("block1Title", v, (vv) => updateCustom("block1Title", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block1Title"} onAI={() => translateOne("block1Title")} />
                  <SvenditaField label="Righe" hint="Una per riga" multi value={tval("block1Lines", form.customConfig.block1Lines)} onChange={(v) => tset("block1Lines", v, (vv) => updateCustom("block1Lines", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block1Lines"} onAI={() => translateOne("block1Lines")} />
                  <div className="grid grid-cols-2 gap-3">
                    <SvenditaField label="Highlight (prefisso)" hint="Es. 'Sconti fino al '" value={tval("block1HighlightPrefix", form.customConfig.block1HighlightPrefix)} onChange={(v) => tset("block1HighlightPrefix", v, (vv) => updateCustom("block1HighlightPrefix", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block1HighlightPrefix"} onAI={() => translateOne("block1HighlightPrefix")} />
                    <SvenditaField label="Highlight (in grassetto)" hint="Es. '40%' — lascia vuoto per nasconderlo" value={tval("block1HighlightStrong", form.customConfig.block1HighlightStrong)} onChange={(v) => tset("block1HighlightStrong", v, (vv) => updateCustom("block1HighlightStrong", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block1HighlightStrong"} onAI={() => translateOne("block1HighlightStrong")} />
                  </div>
                  <SvenditaField label="Periodo Online" hint="Mostrato sotto il blocco Online (es. 'Dal 15 Maggio al 30 Giugno 2026')" value={tval("block1Period", form.customConfig.block1Period)} onChange={(v) => tset("block1Period", v, (vv) => updateCustom("block1Period", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block1Period"} onAI={() => translateOne("block1Period")} />
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-2">Blocco 2 — Showroom (icona pin)</h4>
                <div className="space-y-3">
                  <SvenditaField label="Titolo blocco" value={tval("block2Title", form.customConfig.block2Title)} onChange={(v) => tset("block2Title", v, (vv) => updateCustom("block2Title", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block2Title"} onAI={() => translateOne("block2Title")} />
                  <SvenditaField label="Righe" hint="Una per riga (indirizzo, modalità, etc.)" multi value={tval("block2Lines", form.customConfig.block2Lines)} onChange={(v) => tset("block2Lines", v, (vv) => updateCustom("block2Lines", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block2Lines"} onAI={() => translateOne("block2Lines")} />
                  <div className="grid grid-cols-2 gap-3">
                    <SvenditaField label="Highlight (prefisso)" value={tval("block2HighlightPrefix", form.customConfig.block2HighlightPrefix)} onChange={(v) => tset("block2HighlightPrefix", v, (vv) => updateCustom("block2HighlightPrefix", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block2HighlightPrefix"} onAI={() => translateOne("block2HighlightPrefix")} />
                    <SvenditaField label="Highlight (in grassetto)" value={tval("block2HighlightStrong", form.customConfig.block2HighlightStrong)} onChange={(v) => tset("block2HighlightStrong", v, (vv) => updateCustom("block2HighlightStrong", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block2HighlightStrong"} onAI={() => translateOne("block2HighlightStrong")} />
                  </div>
                  <SvenditaField label="Periodo Showroom" hint="Mostrato sotto il blocco Showroom (es. 'Dal 1 Giugno al 31 Luglio 2026')" value={tval("block2Period", form.customConfig.block2Period)} onChange={(v) => tset("block2Period", v, (vv) => updateCustom("block2Period", vv))} aiVisible={isT} aiBusy={aiBusyKey === "block2Period"} onAI={() => translateOne("block2Period")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Descrizione lunga (sotto i 3 blocchi)</h4>
                  {isT && <AIButton busy={aiBusyKey === "longDescription"} onClick={() => translateOne("longDescription")} />}
                </div>
                <textarea value={tval("longDescription", form.customConfig.longDescription)} onChange={(e) => tset("longDescription", e.target.value, (v) => updateCustom("longDescription", v))} rows={10}
                  className="w-full border border-warm-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-warm-500" />
                <p className="text-[10px] text-warm-500 mt-1">Supporta markdown leggero: **grassetto**, righe vuote per paragrafi, `- ` per liste puntate.</p>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-2">Card del form (lato destro)</h4>
                <div className="space-y-3">
                  <SvenditaField label="Titolo card" value={tval("formCardTitle", form.customConfig.formCardTitle)} onChange={(v) => tset("formCardTitle", v, (vv) => updateCustom("formCardTitle", vv))} aiVisible={isT} aiBusy={aiBusyKey === "formCardTitle"} onAI={() => translateOne("formCardTitle")} />
                  <SvenditaField label="Sottotitolo card" value={tval("formCardSubtitle", form.customConfig.formCardSubtitle)} onChange={(v) => tset("formCardSubtitle", v, (vv) => updateCustom("formCardSubtitle", vv))} aiVisible={isT} aiBusy={aiBusyKey === "formCardSubtitle"} onAI={() => translateOne("formCardSubtitle")} />
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3 mt-2">Card di successo (mostrata dopo il submit)</h4>
                <div className="space-y-3">
                  <SvenditaField label="Titolo (es. 'Richiesta inviata')" value={tval("successCardTitle", form.customConfig.successCardTitle)} onChange={(v) => tset("successCardTitle", v, (vv) => updateCustom("successCardTitle", vv))} aiVisible={isT} aiBusy={aiBusyKey === "successCardTitle"} onAI={() => translateOne("successCardTitle")} />
                  <SvenditaField label="Messaggio sotto il titolo" hint="Mostrato all'utente subito dopo aver inviato il form (prima dell'email)" multi value={tval("successCardMessage", form.customConfig.successCardMessage)} onChange={(v) => tset("successCardMessage", v, (vv) => updateCustom("successCardMessage", vv))} aiVisible={isT} aiBusy={aiBusyKey === "successCardMessage"} onAI={() => translateOne("successCardMessage")} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Disclaimer (sotto il form)</h4>
                  {isT && <AIButton busy={aiBusyKey === "disclaimer"} onClick={() => translateOne("disclaimer")} />}
                </div>
                <textarea value={tval("disclaimer", form.customConfig.disclaimer)} onChange={(e) => tset("disclaimer", e.target.value, (v) => updateCustom("disclaimer", v))} rows={4}
                  className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-warm-500" />
                <p className="text-[10px] text-warm-500 mt-1">Una riga per ogni capoverso. Mostrato in basso a destra, sotto al form.</p>
              </div>

              {/* Etichette campi form (visibile solo quando si traduce) */}
              {isT && (
                <div className="border-t border-warm-200 pt-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 mb-3">
                    Etichette campi del form ({tlang.toUpperCase()})
                  </h4>
                  <p className="text-[10px] text-warm-500 mb-3">Traduci la label di ogni campo del form. La label IT è mostrata a sinistra come riferimento.</p>
                  <div className="space-y-2">
                    {form.formFields.filter((f) => f.enabled).sort((a, b) => a.order - b.order).map((f) => (
                      <div key={f.key} className="grid grid-cols-[180px_1fr_auto] gap-3 items-center">
                        <div className="text-xs text-warm-500">
                          <span className="font-mono text-[10px] text-warm-400">{f.key}</span>
                          <div className="text-warm-700">{f.label}</div>
                        </div>
                        <input
                          type="text"
                          value={parsedFormLabels[f.key] || ""}
                          onChange={(e) => setFormLabel(f.key, e.target.value)}
                          placeholder={`Traduzione ${tlang.toUpperCase()}...`}
                          className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-warm-500"
                        />
                        <AIButton
                          busy={aiBusyKey === `__formLabel_${f.key}`}
                          onClick={() => translateOneFormLabel(f.key, f.label)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Successo */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Pagina di successo</h3>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Testo pulsante form</label>
                {isT && <AIButton busy={aiBusyKey === "buttonLabel"} onClick={() => translateOne("buttonLabel")} />}
              </div>
              <input type="text" value={tval("buttonLabel", form.buttonLabel)} onChange={(e) => tset("buttonLabel", e.target.value, (v) => updateField("buttonLabel", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Titolo successo</label>
                {isT && <AIButton busy={aiBusyKey === "successTitle"} onClick={() => translateOne("successTitle")} />}
              </div>
              <input type="text" value={tval("successTitle", form.successTitle)} onChange={(e) => tset("successTitle", e.target.value, (v) => updateField("successTitle", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Messaggio successo</label>
                {isT && <AIButton busy={aiBusyKey === "successMessage"} onClick={() => translateOne("successMessage")} />}
              </div>
              <textarea value={tval("successMessage", form.successMessage)} onChange={(e) => tset("successMessage", e.target.value, (v) => updateField("successMessage", v))} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" placeholder="Testo opzionale sotto il titolo" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Privacy label</label>
                {isT && <AIButton busy={aiBusyKey === "privacyLabel"} onClick={() => translateOne("privacyLabel")} />}
              </div>
              <textarea value={tval("privacyLabel", form.privacyLabel)} onChange={(e) => tset("privacyLabel", e.target.value, (v) => updateField("privacyLabel", v))} rows={2} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Marketing label</label>
                {isT && <AIButton busy={aiBusyKey === "marketingLabel"} onClick={() => translateOne("marketingLabel")} />}
              </div>
              <input type="text" value={tval("marketingLabel", form.marketingLabel)} onChange={(e) => tset("marketingLabel", e.target.value, (v) => updateField("marketingLabel", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Email Tab ═══ */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Template email — uno per lingua */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Template Email {isT && <span className="ml-2 text-amber-700 font-normal text-xs">— stai modificando la lingua {tlang.toUpperCase()}</span>}</h3>
            <p className="text-xs text-warm-500">
              Scegli il template che verr&agrave; inviato con il QR code dopo la registrazione.
              {isT
                ? <> Questo template viene usato quando il visitatore si iscrive in <strong>{tlang.toUpperCase()}</strong>. Se non scegli nulla qui, viene usato il template IT come fallback.</>
                : <> Questo &egrave; il template di <strong>default (italiano)</strong>. Cambia lingua dal dropdown in cima al tab Configurazione per impostare un template diverso per ogni lingua.</>}
            </p>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Template{isT ? ` (${tlang.toUpperCase()})` : ""}
              </label>
              <select
                value={tval("emailTemplateId", form.emailTemplateId)}
                onChange={(e) => tset("emailTemplateId", e.target.value, (v) => updateField("emailTemplateId", v))}
                className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none"
              >
                <option value="">-- {isT ? `Usa il template IT come fallback` : `Nessun template (usa titolo/corpo personalizzato)`} --</option>
                {emailTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.subject ? `— ${t.subject}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Preview del template attualmente selezionato (per la lingua attiva) */}
            {(() => {
              const currentId = isT ? (translations[tlang]?.emailTemplateId || "") : form.emailTemplateId;
              if (!currentId) return null;
              const tpl = emailTemplates.find(t => t.id === currentId);
              return tpl?.previewHtml ? (
                <div className="border border-warm-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-warm-50 text-xs text-warm-500 font-medium border-b border-warm-200">
                    Anteprima template {isT ? `(${tlang.toUpperCase()})` : "(IT)"}
                  </div>
                  <iframe srcDoc={tpl.previewHtml} className="w-full h-[300px] bg-white" title="Email preview" />
                </div>
              ) : null;
            })()}
          </div>

          {/* Fallback: campi manuali (se nessun template scelto) */}
          {!form.emailTemplateId && (
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-warm-800">Contenuto email personalizzato</h3>
              <p className="text-xs text-warm-500">Questi campi vengono usati solo se non selezioni un template sopra. {isT && <span className="text-amber-700 font-medium">Stai modificando la traduzione {tlang.toUpperCase()}.</span>}</p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Titolo email</label>
                  {isT && <AIButton busy={aiBusyKey === "emailTitle"} onClick={() => translateOne("emailTitle")} />}
                </div>
                <input type="text" value={tval("emailTitle", form.emailTitle)} onChange={(e) => tset("emailTitle", e.target.value, (v) => updateField("emailTitle", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Corpo email</label>
                  {isT && <AIButton busy={aiBusyKey === "emailBody"} onClick={() => translateOne("emailBody")} />}
                </div>
                <textarea value={tval("emailBody", form.emailBody)} onChange={(e) => tset("emailBody", e.target.value, (v) => updateField("emailBody", v))} rows={5} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
              </div>
            </div>
          )}

          {/* Oggetto email (sempre visibile) */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Oggetto email</h3>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">Oggetto</label>
                {isT && <AIButton busy={aiBusyKey === "emailSubject"} onClick={() => translateOne("emailSubject")} />}
              </div>
              <input type="text" value={tval("emailSubject", form.emailSubject)} onChange={(e) => tset("emailSubject", e.target.value, (v) => updateField("emailSubject", v))} className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none" placeholder="Es. Registrazione confermata — Milan Design Week 2026" />
            </div>
          </div>

          {/* Footer email */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">Footer Email</h3>
            <p className="text-xs text-warm-500">Configura il footer che apparirà in fondo alle email di conferma registrazione.</p>

            {/* Social links toggles */}
            <div className="border-t border-warm-100 pt-4">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-3">Link social</p>
              <div className="space-y-3">
                {([
                  { key: "showInstagram", urlKey: "instagramUrl", label: "Instagram" },
                  { key: "showFacebook", urlKey: "facebookUrl", label: "Facebook" },
                  { key: "showLinkedin", urlKey: "linkedinUrl", label: "LinkedIn" },
                  { key: "showPinterest", urlKey: "pinterestUrl", label: "Pinterest" },
                  { key: "showWeb", urlKey: "webUrl", label: "Website" },
                ] as const).map(({ key, urlKey, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input type="checkbox" checked={form.emailFooter[key]} onChange={(e) => {
                      setForm(p => ({ ...p, emailFooter: { ...p.emailFooter, [key]: e.target.checked } })); setSaved(false);
                    }} className="accent-warm-800 w-4 h-4" />
                    <span className="text-sm text-warm-700 w-20 shrink-0">{label}</span>
                    <input type="text" value={form.emailFooter[urlKey]} onChange={(e) => {
                      setForm(p => ({ ...p, emailFooter: { ...p.emailFooter, [urlKey]: e.target.value } })); setSaved(false);
                    }} className="flex-1 border border-warm-200 rounded px-3 py-1.5 text-sm focus:outline-none" placeholder="https://..." disabled={!form.emailFooter[key]} />
                  </div>
                ))}
              </div>
            </div>

            {/* Text lines */}
            <div className="border-t border-warm-100 pt-4">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-3">Testo footer</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Riga 1 (titolo)</label>
                  <input type="text" value={form.emailFooter.line1} onChange={(e) => {
                    setForm(p => ({ ...p, emailFooter: { ...p.emailFooter, line1: e.target.value } })); setSaved(false);
                  }} className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Es. Gebrüder Thonet Vienna GmbH" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Riga 2</label>
                  <input type="text" value={form.emailFooter.line2} onChange={(e) => {
                    setForm(p => ({ ...p, emailFooter: { ...p.emailFooter, line2: e.target.value } })); setSaved(false);
                  }} className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Es. www.gebruederthonetvienna.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Riga 3</label>
                  <input type="text" value={form.emailFooter.line3} onChange={(e) => {
                    setForm(p => ({ ...p, emailFooter: { ...p.emailFooter, line3: e.target.value } })); setSaved(false);
                  }} className="w-full border border-warm-200 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Testo opzionale..." />
                </div>
              </div>
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

      {/* ═══ Scanner Tab ═══ */}
      {activeTab === "scanner" && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-warm-900 mb-1">Scansiona QR Code</h2>
            <p className="text-xs text-warm-500 mb-4">Scansiona il QR code degli invitati per il check-in.</p>

            <div className="mb-4">
              {scanning || scanPaused ? (
                <div>
                  <div className="relative w-full max-w-[400px] mx-auto mb-3">
                    <div id="qr-reader" className={`rounded-lg overflow-hidden w-full ${scanPaused ? "opacity-20" : ""}`} />
                    {/* Overlay risultato check-in */}
                    {scanPaused && scanResult && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ backgroundColor: !scanResult.success ? "rgba(220,38,38,0.95)" : scanResult.alreadyCheckedIn ? "rgba(202,138,4,0.95)" : "rgba(22,163,74,0.95)" }}>
                        <div className="text-center text-white px-6">
                          {!scanResult.success ? (
                            <AlertCircle size={56} className="mx-auto mb-3" />
                          ) : scanResult.alreadyCheckedIn ? (
                            <AlertCircle size={56} className="mx-auto mb-3" />
                          ) : (
                            <CheckCircle2 size={56} className="mx-auto mb-3" />
                          )}
                          <p className="text-xl font-bold mb-1">
                            {!scanResult.success ? "Non valido" : scanResult.alreadyCheckedIn ? "Già fatto check-in" : "Check-in OK!"}
                          </p>
                          {scanResult.data && (
                            <p className="text-lg opacity-90">{scanResult.data.firstName} {scanResult.data.lastName}</p>
                          )}
                          {!scanResult.success && scanResult.error && (
                            <p className="text-sm opacity-80 mt-1">{scanResult.error}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {!scanPaused && (
                    <div className="text-center">
                      <button onClick={() => { setScanning(false); setScanPaused(false); }} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-warm-600 bg-warm-100 rounded-lg hover:bg-warm-200 active:bg-warm-300">
                        <X size={16} /> Chiudi fotocamera
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => { setScanResult(null); lastScannedRef.current = ""; setScanning(true); }} className="flex items-center justify-center gap-3 bg-warm-800 text-white py-5 sm:py-4 rounded-lg text-base sm:text-sm font-medium hover:bg-warm-900 active:bg-warm-950">
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

          {/* Risultato per input manuale (non camera) */}
          {scanResult && !scanning && !scanPaused && (
            <div className={`rounded-xl shadow-sm border p-4 mb-4 ${!scanResult.success ? "bg-red-50 border-red-200" : scanResult.alreadyCheckedIn ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-start gap-3">
                {!scanResult.success ? <AlertCircle size={28} className="text-red-500 shrink-0" /> : scanResult.alreadyCheckedIn ? <AlertCircle size={28} className="text-yellow-600 shrink-0" /> : <CheckCircle2 size={28} className="text-green-500 shrink-0" />}
                <div>
                  <p className="font-semibold text-base">{!scanResult.success ? "Non valido" : scanResult.alreadyCheckedIn ? "Già fatto check-in" : "Check-in OK!"}</p>
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
