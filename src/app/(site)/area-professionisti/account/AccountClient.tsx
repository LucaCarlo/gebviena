"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, LogOut } from "lucide-react";

interface InitialData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  role: string;
  language: string;
}

interface I18n {
  summary: string; emailLogin: string; role: string;
  personal: string; firstName: string; lastName: string; phone: string; companyLabel: string; language: string;
  saveData: string; saving: string; saved: string; required: string; networkError: string;
  passwordTitle: string; passwordCurrent: string; passwordNew: string; passwordConfirm: string;
  passwordHint: string; passwordBtn: string; passwordChanging: string; passwordChanged: string;
  passwordMismatch: string; passwordWeak: string; fieldRequired: string;
  logout: string;
}

interface Msg { type: "success" | "error"; text: string }

const LANG_LABEL: Record<string, string> = {
  it: "Italiano", fr: "Français", en: "English", de: "Deutsch", es: "Español",
};

export default function AccountClient({ initialData, i18n }: { initialData: InitialData; i18n: I18n }) {
  const router = useRouter();

  const [profile, setProfile] = useState({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    phone: initialData.phone,
    company: initialData.company,
    language: initialData.language,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null);

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<Msg | null>(null);

  const updProfile = (k: keyof typeof profile, v: string) =>
    setProfile((prev) => ({ ...prev, [k]: v }));

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.company.trim()) {
      setProfileMsg({ type: "error", text: i18n.required });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/professionals/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileMsg({ type: "error", text: data.error || i18n.networkError });
        return;
      }
      setProfileMsg({ type: "success", text: i18n.saved });
      router.refresh();
    } catch {
      setProfileMsg({ type: "error", text: i18n.networkError });
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPwd(e: FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (!pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword) {
      setPwdMsg({ type: "error", text: i18n.fieldRequired });
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdMsg({ type: "error", text: i18n.passwordMismatch });
      return;
    }
    if (pwd.newPassword.length < 8 || !/[A-Z]/.test(pwd.newPassword) || !/[a-z]/.test(pwd.newPassword) || !/\d/.test(pwd.newPassword)) {
      setPwdMsg({ type: "error", text: i18n.passwordWeak });
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/professionals/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwdMsg({ type: "error", text: data.error || i18n.networkError });
        return;
      }
      setPwdMsg({ type: "success", text: i18n.passwordChanged });
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setPwdMsg({ type: "error", text: i18n.networkError });
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/professionals/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/area-professionisti/accesso";
  }

  const sectionTitle = "text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-4";
  const fieldLabel = "block text-[11px] uppercase tracking-wider text-warm-600 mb-1.5";
  const input = "w-full border border-warm-300 px-4 py-2.5 text-sm bg-white focus:border-warm-700 focus:outline-none focus:ring-1 focus:ring-warm-700";
  const inputReadonly = "w-full border border-warm-200 px-4 py-2.5 text-sm bg-warm-50 text-warm-500 cursor-not-allowed";
  const btnPrimary = "inline-flex items-center gap-2 bg-warm-900 hover:bg-warm-700 text-white px-6 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-10">
      <section className="bg-white border border-warm-200 p-6">
        <div className={sectionTitle}>{i18n.summary}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>{i18n.emailLogin}</label>
            <input type="email" value={initialData.email} readOnly className={inputReadonly} />
          </div>
          <div>
            <label className={fieldLabel}>{i18n.role}</label>
            <input type="text" value={initialData.role} readOnly className={inputReadonly} />
          </div>
        </div>
      </section>

      <section className="bg-white border border-warm-200 p-6">
        <div className={sectionTitle}>{i18n.personal}</div>
        <form onSubmit={submitProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>{i18n.firstName}</label>
              <input type="text" required value={profile.firstName} onChange={(e) => updProfile("firstName", e.target.value)} className={input} />
            </div>
            <div>
              <label className={fieldLabel}>{i18n.lastName}</label>
              <input type="text" required value={profile.lastName} onChange={(e) => updProfile("lastName", e.target.value)} className={input} />
            </div>
            <div>
              <label className={fieldLabel}>{i18n.phone}</label>
              <input type="tel" value={profile.phone} onChange={(e) => updProfile("phone", e.target.value)} placeholder="+39 …" className={input} />
            </div>
            <div>
              <label className={fieldLabel}>{i18n.companyLabel}</label>
              <input type="text" required value={profile.company} onChange={(e) => updProfile("company", e.target.value)} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className={fieldLabel}>{i18n.language}</label>
              <select value={profile.language} onChange={(e) => updProfile("language", e.target.value)} className={input}>
                {Object.entries(LANG_LABEL).map(([code, lbl]) => (
                  <option key={code} value={code}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>

          {profileMsg && (
            <div className={`flex items-start gap-2 text-[12px] px-3 py-2 ${
              profileMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {profileMsg.type === "success" ? <Check size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <button type="submit" disabled={savingProfile} className={btnPrimary}>
            {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {savingProfile ? i18n.saving : i18n.saveData}
          </button>
        </form>
      </section>

      <section className="bg-white border border-warm-200 p-6">
        <div className={sectionTitle}>{i18n.passwordTitle}</div>
        <form onSubmit={submitPwd} className="space-y-4">
          <div>
            <label className={fieldLabel}>{i18n.passwordCurrent}</label>
            <input type="password" required autoComplete="current-password"
              value={pwd.currentPassword}
              onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
              className={input} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>{i18n.passwordNew}</label>
              <input type="password" required autoComplete="new-password"
                value={pwd.newPassword}
                onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                className={input} />
              <p className="text-[10px] text-warm-500 mt-1">{i18n.passwordHint}</p>
            </div>
            <div>
              <label className={fieldLabel}>{i18n.passwordConfirm}</label>
              <input type="password" required autoComplete="new-password"
                value={pwd.confirmPassword}
                onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                className={input} />
            </div>
          </div>

          {pwdMsg && (
            <div className={`flex items-start gap-2 text-[12px] px-3 py-2 ${
              pwdMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {pwdMsg.type === "success" ? <Check size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <button type="submit" disabled={savingPwd} className={btnPrimary}>
            {savingPwd ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {savingPwd ? i18n.passwordChanging : i18n.passwordBtn}
          </button>
        </form>
      </section>

      <div className="flex items-center gap-6 pt-6 border-t border-warm-200">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 border-b border-warm-300 hover:border-warm-900 pb-0.5"
        >
          <LogOut size={13} /> {i18n.logout}
        </button>
      </div>
    </div>
  );
}
