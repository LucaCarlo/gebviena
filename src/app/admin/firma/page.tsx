"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  Save,
  Eye,
  Copy,
  Code,
  Download,
  Plus,
  Trash2,
  Upload,
  FileSignature,
  UserCheck,
  Link,
} from "lucide-react";
import {
  renderSignature,
  DEFAULT_USER_DATA,
  EMPTY_TEMPLATE,
  type SignatureUserData,
  type SignatureTemplateData,
  type SignatureStyle,
} from "./_components/signatureRenderer";

interface TemplateWithUsers extends SignatureTemplateData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  users: { id: string; name: string | null; email: string; role: string }[];
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function AdminFirmaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auth
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
    name: string;
    permissions: Record<string, boolean>;
  } | null>(null);
  const canManageTemplates =
    currentUser?.role === "superadmin" ||
    currentUser?.permissions?.["firma.create"] === true;

  // Templates (admin)
  const [templates, setTemplates] = useState<TemplateWithUsers[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<SignatureTemplateData>({ ...EMPTY_TEMPLATE });
  const [templateName, setTemplateName] = useState("Nuovo Template");

  // All users (admin)
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);

  // Admin: editing which user's data?
  const [adminEditingUserId, setAdminEditingUserId] = useState<string | null>(null);

  // Active tab for admin
  const [activeTab, setActiveTab] = useState<"template" | "utenti">("template");

  // User data (current user or admin-selected user)
  const [userData, setUserData] = useState<SignatureUserData>({ ...DEFAULT_USER_DATA });

  // Non-admin: their template
  const [myTemplate, setMyTemplate] = useState<SignatureTemplateData>({ ...EMPTY_TEMPLATE });

  // ─── Load auth + data ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!authData.success || !authData.data) {
          setLoading(false);
          return;
        }

        const user = authData.data;
        setCurrentUser(user);

        const userCanManage =
          user.role === "superadmin" || user.permissions?.["firma.create"] === true;

        if (userCanManage) {
          // Admin/manager: load templates + users
          const [tRes, uRes] = await Promise.all([
            fetch("/api/signature/templates").then((r) => r.json()),
            fetch("/api/users").then((r) => r.json()),
          ]);

          if (tRes.success && tRes.data) {
            setTemplates(tRes.data);
            if (tRes.data.length > 0) {
              setSelectedTemplateId(tRes.data[0].id);
              loadTemplateIntoForm(tRes.data[0]);
            }
          }
          if (uRes.data) setAllUsers(uRes.data);
          setLoading(false);
        } else {
          // Non-admin: load own signature
          await loadUserSignature(user.id);
        }
      } catch {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const loadTemplateIntoForm = (t: TemplateWithUsers) => {
    setTemplateName(t.name);
    setTemplateForm({
      logoUrl: t.logoUrl,
      bannerUrl: t.bannerUrl,
      showInstagram: t.showInstagram ?? true,
      showFacebook: t.showFacebook ?? true,
      showWeb: t.showWeb ?? true,
      showLinkedin: t.showLinkedin ?? true,
      showPinterest: t.showPinterest ?? true,
      instagramUrl: t.instagramUrl ?? EMPTY_TEMPLATE.instagramUrl,
      facebookUrl: t.facebookUrl ?? EMPTY_TEMPLATE.facebookUrl,
      webLinkUrl: t.webLinkUrl ?? EMPTY_TEMPLATE.webLinkUrl,
      linkedinUrl: t.linkedinUrl ?? EMPTY_TEMPLATE.linkedinUrl,
      pinterestUrl: t.pinterestUrl ?? EMPTY_TEMPLATE.pinterestUrl,
      websiteUrl: t.websiteUrl ?? EMPTY_TEMPLATE.websiteUrl,
      website: t.website ?? EMPTY_TEMPLATE.website,
      style: (t.style as SignatureStyle) ?? "geb",
      disclaimerLang: (t.disclaimerLang as "it" | "en" | "both") ?? "it",
      footerIt: t.footerIt,
      footerEn: t.footerEn,
      ecoText: t.ecoText,
    });
    // Reset user editing
    setAdminEditingUserId(null);
    setUserData({ ...DEFAULT_USER_DATA });
  };

  const loadUserSignature = async (userId: string) => {
    try {
      const res = await fetch(`/api/signature?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.userData) {
          const ud = data.data.userData;
          setUserData({
            fullName: ud.fullName || DEFAULT_USER_DATA.fullName,
            department: ud.department || DEFAULT_USER_DATA.department,
            infoLine1: ud.infoLine1 || DEFAULT_USER_DATA.infoLine1,
            infoLine2: ud.infoLine2 || DEFAULT_USER_DATA.infoLine2,
            address: ud.address || DEFAULT_USER_DATA.address,
            phone: ud.phone || DEFAULT_USER_DATA.phone,
            mobile: ud.mobile || DEFAULT_USER_DATA.mobile || "",
          });
        } else {
          setUserData({ ...DEFAULT_USER_DATA });
        }
        if (data.data.template) {
          setMyTemplate({
            ...EMPTY_TEMPLATE,
            ...data.data.template,
            disclaimerLang: (data.data.template.disclaimerLang as "it" | "en" | "both") || "it",
          });
        }
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  const refreshTemplates = useCallback(async () => {
    const res = await fetch("/api/signature/templates");
    const data = await res.json();
    if (data.success) setTemplates(data.data);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ─── Template selected ──────────────────────────────────────────────────────

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateIntoForm(selectedTemplate);
    }
  }, [selectedTemplateId]);

  // ─── Preview HTML ────────────────────────────────────────────────────────────

  const previewTemplate = canManageTemplates ? templateForm : myTemplate;
  const previewHtml = renderSignature(userData, previewTemplate);


  // ─── Admin: Create template ──────────────────────────────────────────────────

  const handleCreateTemplate = async () => {
    const res = await fetch("/api/signature/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuovo Template" }),
    });
    const data = await res.json();
    if (data.success) {
      await refreshTemplates();
      setSelectedTemplateId(data.data.id);
      showToast("Template creato!");
    }
  };

  // ─── Admin: Save template ───────────────────────────────────────────────────

  const handleSaveTemplate = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/signature/templates/${selectedTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, ...templateForm }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshTemplates();
        showToast("Template salvato!");
      }
    } catch {
      // silent
    }
    setSaving(false);
  };

  // ─── Admin: Delete template ──────────────────────────────────────────────────

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!confirm("Eliminare questo template? Gli utenti assegnati verranno scollegati.")) return;
    await fetch(`/api/signature/templates/${selectedTemplateId}`, { method: "DELETE" });
    await refreshTemplates();
    setSelectedTemplateId(templates.length > 1 ? templates.find((t) => t.id !== selectedTemplateId)?.id || null : null);
    showToast("Template eliminato!");
  };

  // ─── Admin: Assign user ─────────────────────────────────────────────────────

  const handleToggleUser = async (userId: string) => {
    if (!selectedTemplate) return;
    const currentUserIds = selectedTemplate.users.map((u) => u.id);
    const newUserIds = currentUserIds.includes(userId)
      ? currentUserIds.filter((id) => id !== userId)
      : [...currentUserIds, userId];

    await fetch(`/api/signature/templates/${selectedTemplateId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: newUserIds }),
    });
    await refreshTemplates();
  };

  // ─── Admin: Save user data ──────────────────────────────────────────────────

  const handleSaveUserData = async (targetUserId?: string) => {
    setSaving(true);
    try {
      const htmlOutput = renderSignature(userData, canManageTemplates ? templateForm : myTemplate);
      const res = await fetch("/api/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userData,
          htmlOutput,
          targetUserId: targetUserId || (canManageTemplates ? adminEditingUserId : undefined),
        }),
      });
      const data = await res.json();
      if (data.success) showToast("Dati utente salvati!");
    } catch {
      // silent
    }
    setSaving(false);
  };

  // ─── Non-admin: Save own data ────────────────────────────────────────────────

  const handleSaveOwnData = async () => {
    setSaving(true);
    try {
      const htmlOutput = renderSignature(userData, myTemplate);
      const res = await fetch("/api/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userData, htmlOutput }),
      });
      const data = await res.json();
      if (data.success) showToast("Firma salvata!");
    } catch {
      // silent
    }
    setSaving(false);
  };

  // ─── Copy HTML ──────────────────────────────────────────────────────────────

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  };

  // ─── Image upload (base64) ──────────────────────────────────────────────────

  const handleImageUpload = (
    field: keyof SignatureTemplateData,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setTemplateForm((prev) => ({ ...prev, [field]: base64 }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── Update helpers ──────────────────────────────────────────────────────────

  const updateUser = (field: keyof SignatureUserData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTemplate = (field: keyof SignatureTemplateData, value: string | boolean | null) => {
    setTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // USER VIEW (no template management permission)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!canManageTemplates) {
    return (
      <div className="p-4 md:p-6">
        {toast && <Toast message={toast} />}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-warm-900">La mia Firma Email</h1>
            <p className="text-xs text-warm-500 mt-0.5">Compila i tuoi dati personali</p>
          </div>
          <button
            onClick={handleSaveOwnData}
            disabled={saving}
            className="bg-warm-800 text-white px-5 py-2 rounded-lg text-xs font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Save size={14} /> {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-[55%] space-y-4">
            <UserDataForm userData={userData} onChange={updateUser} />
          </div>
          <div className="lg:w-[45%]">
            <PreviewPanel
              previewHtml={previewHtml}
              showHtmlSource={showHtmlSource}
              onToggleSource={() => setShowHtmlSource(!showHtmlSource)}
              onCopy={handleCopyHtml}
              copied={copied}
            />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6">
      {toast && <Toast message={toast} />}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-warm-900">Gestione Firme Email</h1>
          <p className="text-xs text-warm-500 mt-0.5">Crea template e assegna agli utenti</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTemplateId && (
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className="bg-warm-800 text-white px-5 py-2 rounded-lg text-xs font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} /> {saving ? "Salvataggio..." : "Salva Template"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* ── LEFT: Template List ──────────────────────────────────────── */}
        <div className="w-48 flex-shrink-0 space-y-2">
          <button
            onClick={handleCreateTemplate}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border border-dashed border-warm-300 text-warm-600 hover:border-warm-500 hover:text-warm-800 transition-colors"
          >
            <Plus size={14} /> Nuovo Template
          </button>

          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                selectedTemplateId === t.id
                  ? "bg-warm-800 text-white"
                  : "bg-white border border-warm-200 text-warm-700 hover:bg-warm-50"
              }`}
            >
              <div className="font-medium truncate">{t.name}</div>
              <div className={`text-[10px] mt-0.5 ${selectedTemplateId === t.id ? "text-warm-300" : "text-warm-400"}`}>
                {t.users.length} utent{t.users.length === 1 ? "e" : "i"}
              </div>
            </button>
          ))}
        </div>

        {/* ── CENTER: Template Edit / Users ────────────────────────────── */}
        {selectedTemplateId && selectedTemplate ? (
          <div className="w-[460px] flex-shrink-0 space-y-4">
            {/* Template name + delete */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 border border-warm-300 rounded-lg px-4 py-2 text-sm font-semibold focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                placeholder="Nome template..."
              />
              <button
                onClick={handleDeleteTemplate}
                className="p-2 text-warm-400 hover:text-red-500 transition-colors"
                title="Elimina template"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-warm-200">
              <button
                onClick={() => setActiveTab("template")}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeTab === "template" ? "text-warm-900" : "text-warm-400 hover:text-warm-600"
                }`}
              >
                <FileSignature size={14} className="inline mr-1.5" />
                Template
                {activeTab === "template" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-warm-900" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("utenti")}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeTab === "utenti" ? "text-warm-900" : "text-warm-400 hover:text-warm-600"
                }`}
              >
                <UserCheck size={14} className="inline mr-1.5" />
                Utenti ({selectedTemplate.users.length})
                {activeTab === "utenti" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-warm-900" />
                )}
              </button>
            </div>

            {activeTab === "template" ? (
              /* ── Template fields ────────────────────────────────────── */
              <div className="space-y-4">
                {/* Style selector */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                    Stile Template
                  </h3>
                  <select
                    value={templateForm.style || "geb"}
                    onChange={(e) => updateTemplate("style", e.target.value as SignatureStyle)}
                    className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  >
                    <option value="geb">GEB Modern</option>
                    <option value="classic">Classico</option>
                  </select>
                </div>

                {/* Images */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                    Immagini
                  </h3>
                  <ImageUploadRow
                    label="Logo GTV"
                    value={templateForm.logoUrl}
                    onUpload={(e) => handleImageUpload("logoUrl", e)}
                    onRemove={() => updateTemplate("logoUrl", null)}
                    helpText="160 x 64 px"
                  />
                  <ImageUploadRow
                    label="Banner"
                    value={templateForm.bannerUrl}
                    onUpload={(e) => handleImageUpload("bannerUrl", e)}
                    onRemove={() => updateTemplate("bannerUrl", null)}
                    helpText="Immagine a destra del logo"
                  />
                  <div className="border-t border-warm-100 pt-4">
                    <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-3">
                      Icone Social
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <SocialToggle
                        label="Instagram"
                        checked={templateForm.showInstagram}
                        onChange={(v) => setTemplateForm((prev) => ({ ...prev, showInstagram: v }))}
                      />
                      <SocialToggle
                        label="Facebook"
                        checked={templateForm.showFacebook}
                        onChange={(v) => setTemplateForm((prev) => ({ ...prev, showFacebook: v }))}
                      />
                      <SocialToggle
                        label="Web"
                        checked={templateForm.showWeb}
                        onChange={(v) => setTemplateForm((prev) => ({ ...prev, showWeb: v }))}
                      />
                      {templateForm.style === "geb" && (
                        <>
                          <SocialToggle
                            label="LinkedIn"
                            checked={templateForm.showLinkedin ?? true}
                            onChange={(v) => setTemplateForm((prev) => ({ ...prev, showLinkedin: v }))}
                          />
                          <SocialToggle
                            label="Pinterest"
                            checked={templateForm.showPinterest ?? true}
                            onChange={(v) => setTemplateForm((prev) => ({ ...prev, showPinterest: v }))}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social URLs & Website */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                    Social e Sito Web
                  </h3>
                  <FieldInput
                    label="Instagram URL"
                    value={templateForm.instagramUrl || ""}
                    onChange={(v) => updateTemplate("instagramUrl", v)}
                    placeholder="https://www.instagram.com/..."
                  />
                  <FieldInput
                    label="Facebook URL"
                    value={templateForm.facebookUrl || ""}
                    onChange={(v) => updateTemplate("facebookUrl", v)}
                    placeholder="https://www.facebook.com/..."
                  />
                  <FieldInput
                    label="Web URL (icona globo)"
                    value={templateForm.webLinkUrl || ""}
                    onChange={(v) => updateTemplate("webLinkUrl", v)}
                    placeholder="https://www...."
                  />
                  {templateForm.style === "geb" && (
                    <>
                      <FieldInput
                        label="LinkedIn URL"
                        value={templateForm.linkedinUrl || ""}
                        onChange={(v) => updateTemplate("linkedinUrl", v)}
                        placeholder="https://www.linkedin.com/company/..."
                      />
                      <FieldInput
                        label="Pinterest URL"
                        value={templateForm.pinterestUrl || ""}
                        onChange={(v) => updateTemplate("pinterestUrl", v)}
                        placeholder="https://www.pinterest.com/..."
                      />
                    </>
                  )}
                  <div className="border-t border-warm-100 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldInput
                        label="Sito web (testo visibile)"
                        value={templateForm.website || ""}
                        onChange={(v) => updateTemplate("website", v)}
                        placeholder="www.example.com"
                      />
                      <FieldInput
                        label="Sito web (URL)"
                        value={templateForm.websiteUrl || ""}
                        onChange={(v) => updateTemplate("websiteUrl", v)}
                        placeholder="http://www.example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer texts + Disclaimer language */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                    Disclaimer e Footer
                  </h3>
                  <div>
                    <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">
                      Lingua Disclaimer
                    </label>
                    <div className="flex items-center gap-1">
                      {(["it", "en", "both"] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setTemplateForm((prev) => ({ ...prev, disclaimerLang: lang }))}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            templateForm.disclaimerLang === lang
                              ? "bg-warm-800 text-white"
                              : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                          }`}
                        >
                          {lang === "it" ? "Italiano" : lang === "en" ? "Inglese" : "Entrambi"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RichTextarea
                    label="Disclaimer Italiano"
                    value={templateForm.footerIt || ""}
                    onChange={(v) => updateTemplate("footerIt", v)}
                  />
                  <RichTextarea
                    label="Disclaimer Inglese"
                    value={templateForm.footerEn || ""}
                    onChange={(v) => updateTemplate("footerEn", v)}
                  />
                  <FieldInput
                    label="Testo ecologico (verde)"
                    value={templateForm.ecoText || ""}
                    onChange={(v) => updateTemplate("ecoText", v)}
                  />
                </div>
              </div>
            ) : (
              /* ── Users tab ─────────────────────────────────────────── */
              <div className="space-y-4">
                {/* Assign users */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
                  <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-3">
                    Assegna utenti a questo template
                  </h3>
                  <div className="space-y-1">
                    {allUsers.map((user) => {
                      const isAssigned = selectedTemplate.users.some((u) => u.id === user.id);
                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                            isAssigned
                              ? "bg-green-50 border border-green-200"
                              : "bg-warm-50 border border-warm-100 hover:bg-warm-100"
                          }`}
                        >
                          <span
                            onClick={(e) => { e.preventDefault(); handleToggleUser(user.id); }}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isAssigned
                                ? "bg-green-500 border-green-500"
                                : "border-warm-300 bg-white"
                            }`}
                          >
                            {isAssigned && (
                              <Check size={13} className="text-white" strokeWidth={3} />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-warm-800">{user.name || user.email}</span>
                            <span className="text-[10px] text-warm-400 ml-2">{user.role}</span>
                          </div>
                          {isAssigned && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setAdminEditingUserId(user.id);
                                loadUserSignature(user.id);
                              }}
                              className="text-[10px] text-warm-500 hover:text-warm-800 underline flex-shrink-0"
                            >
                              Modifica dati
                            </button>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Edit user data (when admin clicks "Modifica dati") */}
                {adminEditingUserId && (
                  <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                        Dati di {allUsers.find((u) => u.id === adminEditingUserId)?.name || "utente"}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveUserData(adminEditingUserId)}
                          disabled={saving}
                          className="bg-warm-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          <Save size={12} /> Salva dati
                        </button>
                        <button
                          onClick={() => {
                            setAdminEditingUserId(null);
                            setUserData({ ...DEFAULT_USER_DATA });
                          }}
                          className="text-xs text-warm-400 hover:text-warm-600"
                        >
                          Chiudi
                        </button>
                      </div>
                    </div>
                    <UserDataForm userData={userData} onChange={updateUser} />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-20 text-warm-400 text-sm">
            Seleziona o crea un template per iniziare
          </div>
        )}

        {/* ── RIGHT: Preview ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 hidden xl:block">
          <PreviewPanel
            previewHtml={previewHtml}
            showHtmlSource={showHtmlSource}
            onToggleSource={() => setShowHtmlSource(!showHtmlSource)}
            onCopy={handleCopyHtml}
            copied={copied}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800">
      <Check size={16} />
      {message}
    </div>
  );
}

function UserDataForm({
  userData,
  onChange,
}: {
  userData: SignatureUserData;
  onChange: (field: keyof SignatureUserData, value: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
        Dati personali
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Nome e Cognome" value={userData.fullName} onChange={(v) => onChange("fullName", v)} />
        <FieldInput label="Reparto / Ruolo" value={userData.department} onChange={(v) => onChange("department", v)} />
      </div>
      <FieldInput label="Riga info 1" value={userData.infoLine1} onChange={(v) => onChange("infoLine1", v)} placeholder="es. Offices of the trademarks' licensee" />
      <FieldInput label="Riga info 2 (Azienda)" value={userData.infoLine2} onChange={(v) => onChange("infoLine2", v)} placeholder="es. Production Furniture International S.p.A." />
      <FieldInput label="Indirizzo" value={userData.address} onChange={(v) => onChange("address", v)} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Telefono" value={userData.phone} onChange={(v) => onChange("phone", v)} placeholder="es. Tel. +39 011..." />
        <FieldInput label="Mobile" value={userData.mobile || ""} onChange={(v) => onChange("mobile", v)} placeholder="es. mobile +39 345..." />
      </div>
    </div>
  );
}

function PreviewPanel({
  previewHtml,
  showHtmlSource,
  onToggleSource,
  onCopy,
  copied,
}: {
  previewHtml: string;
  showHtmlSource: boolean;
  onToggleSource: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const handleDownloadHtm = () => {
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "firma.htm";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 sticky top-4">
      <div className="px-3 py-2 border-b border-warm-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Eye size={14} className="text-warm-500" />
          <h2 className="text-xs font-semibold text-warm-800 uppercase tracking-wider">
            Anteprima
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownloadHtm}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <Download size={11} /> Scarica .htm
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-warm-100 text-warm-600 hover:bg-warm-200"
          >
            <Copy size={11} /> {copied ? "Copiato!" : "Copia HTML"}
          </button>
          <button
            type="button"
            onClick={onToggleSource}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
              showHtmlSource
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            <Code size={11} /> HTML
          </button>
        </div>
      </div>
      <div className="p-3">
        {showHtmlSource ? (
          <textarea
            readOnly
            value={previewHtml}
            className="w-full h-72 border border-warm-300 rounded px-2 py-1.5 text-[10px] font-mono text-warm-700 focus:outline-none resize-y bg-warm-50"
          />
        ) : (
          <div style={{ transform: "scale(0.75)", transformOrigin: "top left", width: "133%", minHeight: "350px" }}>
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: "550px", overflow: "hidden" }}
              title="Anteprima firma"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
      />
    </div>
  );
}

function ImageUploadRow({
  label,
  value,
  onUpload,
  onRemove,
  helpText,
}: {
  label: string;
  value: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-2 p-2 bg-warm-50 rounded border border-warm-200">
          <div className="w-16 h-8 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="w-full h-full object-contain" />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-warm-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-warm-300 rounded cursor-pointer hover:border-warm-500 transition-colors">
          <Upload size={14} className="text-warm-400" />
          <span className="text-xs text-warm-500">Carica</span>
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      )}
      {helpText && <p className="text-[9px] text-warm-400 mt-0.5">{helpText}</p>}
    </div>
  );
}

function RichTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);

  // Floating toolbar state
  const [toolbar, setToolbar] = useState<{ x: number; y: number; isLink: boolean } | null>(null);
  // Link URL input state
  const [linkInput, setLinkInput] = useState<{ x: number; y: number; url: string } | null>(null);

  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const getSelectionPos = (): { x: number; y: number } | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) return null;
    return {
      x: rect.left - wrapperRect.left + rect.width / 2,
      y: rect.top - wrapperRect.top - 8,
    };
  };

  const isInsideLink = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "A") return true;
      node = node.parentNode;
    }
    return false;
  };

  const handleSelectionChange = () => {
    const sel = window.getSelection();
    if (
      !sel ||
      sel.isCollapsed ||
      !editorRef.current?.contains(sel.anchorNode)
    ) {
      if (!linkInput) setToolbar(null);
      return;
    }
    const pos = getSelectionPos();
    if (pos) {
      setToolbar({ ...pos, isLink: isInsideLink() });
    }
  };

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkInput]);

  const handleShowLinkInput = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    const pos = getSelectionPos();
    if (!pos) return;
    // Pre-fill with existing href if editing a link
    let existingUrl = "";
    if (isInsideLink()) {
      let node: Node | null = sel?.anchorNode || null;
      while (node && node !== editorRef.current) {
        if (node.nodeName === "A") {
          existingUrl = (node as HTMLAnchorElement).href;
          break;
        }
        node = node.parentNode;
      }
    }
    setToolbar(null);
    setLinkInput({ x: pos.x, y: pos.y, url: existingUrl || "mailto:" });
  };

  const handleApplyLink = () => {
    if (!linkInput || !savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    if (linkInput.url.trim()) {
      document.execCommand("createLink", false, linkInput.url.trim());
    }
    handleInput();
    setLinkInput(null);
    savedRangeRef.current = null;
  };

  const handleRemoveLink = () => {
    document.execCommand("unlink");
    handleInput();
    setToolbar(null);
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyLink();
    }
    if (e.key === "Escape") {
      setLinkInput(null);
      savedRangeRef.current = null;
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div ref={wrapperRef} className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={() => {
            handleInput();
            setTimeout(() => {
              if (!linkInput) setToolbar(null);
            }, 200);
          }}
          className="w-full min-h-[72px] border border-warm-300 rounded px-3 py-2 text-xs focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 overflow-auto [&_a]:text-orange-600 [&_a]:underline"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        />

        {/* Floating toolbar on text selection */}
        {toolbar && !linkInput && (
          <div
            className="absolute z-50 flex items-center gap-1 bg-warm-900 rounded-lg shadow-lg px-1.5 py-1 -translate-x-1/2 -translate-y-full"
            style={{ left: toolbar.x, top: toolbar.y }}
          >
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleShowLinkInput(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white hover:bg-warm-700 transition-colors"
            >
              <Link size={10} /> Link
            </button>
            {toolbar.isLink && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleRemoveLink(); }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-warm-300 hover:text-white hover:bg-warm-700 transition-colors"
              >
                Rimuovi
              </button>
            )}
          </div>
        )}

        {/* Inline URL input */}
        {linkInput && (
          <div
            className="absolute z-50 flex items-center gap-1 bg-white border border-warm-300 rounded-lg shadow-lg px-2 py-1.5 -translate-x-1/2 -translate-y-full"
            style={{ left: linkInput.x, top: linkInput.y }}
          >
            <input
              autoFocus
              type="text"
              value={linkInput.url}
              onChange={(e) => setLinkInput({ ...linkInput, url: e.target.value })}
              onKeyDown={handleLinkKeyDown}
              placeholder="URL..."
              className="w-48 border border-warm-200 rounded px-2 py-0.5 text-[11px] focus:border-warm-800 focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleApplyLink(); }}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              OK
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setLinkInput(null); savedRangeRef.current = null; }}
              className="px-1.5 py-0.5 rounded text-[10px] text-warm-400 hover:text-warm-600 transition-colors"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SocialToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-warm-800" : "bg-warm-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      <span className="text-xs text-warm-700">{label}</span>
    </label>
  );
}
