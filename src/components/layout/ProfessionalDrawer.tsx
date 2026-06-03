"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import { useT, useLang } from "@/contexts/I18nContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register";
type Role = "ARCHITECT_DESIGNER" | "PRESS" | "RESELLER" | "AGENT";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  passwordConfirm: string;
  role: Role;
  acceptsPrivacy: boolean;
  marketingOptIn: boolean;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  password: "",
  passwordConfirm: "",
  role: "ARCHITECT_DESIGNER",
  acceptsPrivacy: false,
  marketingOptIn: false,
};

/** Drawer "Area Professionisti": login + registrazione + selezione ruolo.
 *  Si apre da destra. ESC + click fuori per chiudere. */
export default function ProfessionalDrawer({ open, onClose }: Props) {
  const t = useT();
  const lang = useLang();
  const { executeRecaptcha } = useRecaptcha();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form e error quando il drawer si chiude/apre
  useEffect(() => {
    if (open) {
      setError("");
      setSubmitting(false);
    } else {
      // Cleanup leggero: lascia il form valorizzato (utile se l'utente apre/chiude
      // per leggere qualcosa), ma resetta password per sicurezza.
      setForm((f) => ({ ...f, password: "", passwordConfirm: "" }));
    }
  }, [open]);

  // Chiusura con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Blocco lo scroll del body sotto al drawer
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const validatePassword = (pwd: string): boolean =>
    pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Validazioni client (i controlli veri sono server-side)
    if (mode === "register") {
      if (!form.firstName || !form.lastName || !form.email || !form.company || !form.password) {
        setError(t("pro.error.missing"));
        return;
      }
      if (!form.acceptsPrivacy) {
        setError(t("pro.error.privacy"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError(t("pro.error.email"));
        return;
      }
      if (!validatePassword(form.password)) {
        setError(t("pro.error.weakPassword"));
        return;
      }
      if (form.password !== form.passwordConfirm) {
        setError(t("pro.password.mismatch"));
        return;
      }
    } else {
      if (!form.email || !form.password) {
        setError(t("pro.error.missing"));
        return;
      }
    }

    setSubmitting(true);
    try {
      // reCAPTCHA: usa lo stesso provider del resto del sito
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha(mode === "register" ? "professional_register" : "professional_login");
      }

      const url = mode === "register" ? "/api/professionals/register" : "/api/professionals/login";
      const payload = mode === "register"
        ? {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            company: form.company,
            password: form.password,
            role: form.role,
            language: lang,
            acceptsPrivacy: form.acceptsPrivacy,
            marketingOptIn: form.marketingOptIn,
            recaptchaToken,
          }
        : { email: form.email, password: form.password, recaptchaToken };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        // Mappiamo gli errori più comuni a stringhe localizzate
        if (res.status === 409) setError(t("pro.error.duplicateEmail"));
        else if (res.status === 401) setError(t("pro.error.credentials"));
        else if (res.status === 403) setError(t("pro.error.disabled"));
        else setError(data.error || t("pro.error.generic"));
        return;
      }
      // Successo → vai alla pagina riservata
      window.location.href = `/${lang === "it" ? "" : lang + "/"}area-professionisti`;
    } catch {
      setError(t("pro.error.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const ROLE_OPTIONS: { value: Role; titleKey: string; descKey: string }[] = [
    { value: "ARCHITECT_DESIGNER", titleKey: "pro.role.architect.title", descKey: "pro.role.architect.desc" },
    { value: "PRESS",              titleKey: "pro.role.press.title",     descKey: "pro.role.press.desc" },
    { value: "RESELLER",           titleKey: "pro.role.reseller.title",  descKey: "pro.role.reseller.desc" },
    { value: "AGENT",              titleKey: "pro.role.agent.title",     descKey: "pro.role.agent.desc" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/55 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-[70] w-full sm:w-[520px] lg:w-[560px] bg-white text-neutral-900 shadow-2xl transform transition-transform duration-400 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t(mode === "login" ? "pro.drawer.title.login" : "pro.drawer.title.register")}
      >
        {/* Header */}
        <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] tracking-[0.18em] uppercase font-semibold text-neutral-900">
              {t(mode === "login" ? "pro.drawer.title.login" : "pro.drawer.title.register")}
            </h2>
            <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">
              {t(mode === "login" ? "pro.drawer.subtitle.login" : "pro.drawer.subtitle.register")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 -mr-1.5 -mt-1.5 p-2"
            aria-label={t("pro.drawer.close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 lg:px-8 pt-4 border-b border-neutral-200">
          <div className="flex gap-6 -mb-px">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`pb-3 text-[12px] tracking-[0.18em] uppercase transition-colors border-b-2 ${
                mode === "login"
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-400 border-transparent hover:text-neutral-700"
              }`}
            >
              {t("pro.drawer.tab.login")}
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`pb-3 text-[12px] tracking-[0.18em] uppercase transition-colors border-b-2 ${
                mode === "register"
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-400 border-transparent hover:text-neutral-700"
              }`}
            >
              {t("pro.drawer.tab.register")}
            </button>
          </div>
        </div>

        {/* Form scrollabile */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-5">
          {mode === "register" && (
            <>
              {/* Selezione ruolo */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 mb-3">
                  {t("pro.role.label")} <span className="text-red-500">*</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const active = form.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("role", opt.value)}
                        className={`text-left p-3 border transition-colors ${
                          active
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            active ? "border-neutral-900" : "border-neutral-300"
                          }`}>
                            {active && <span className="w-2 h-2 rounded-full bg-neutral-900" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-neutral-900 leading-tight">{t(opt.titleKey)}</div>
                            <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{t(opt.descKey)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome / Cognome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("pro.field.firstName")} required value={form.firstName} onChange={(v) => update("firstName", v)} />
                <Field label={t("pro.field.lastName")} required value={form.lastName} onChange={(v) => update("lastName", v)} />
              </div>
            </>
          )}

          {/* Email — sempre */}
          <Field label={t("pro.field.email")} type="email" required value={form.email} onChange={(v) => update("email", v)} autoComplete="email" />

          {mode === "register" && (
            <>
              <Field label={t("pro.field.phone")} type="tel" value={form.phone} onChange={(v) => update("phone", v)} autoComplete="tel" />
              <Field label={t("pro.field.company")} required value={form.company} onChange={(v) => update("company", v)} />
            </>
          )}

          {/* Password */}
          <PasswordField
            label={t("pro.field.password")}
            value={form.password}
            onChange={(v) => update("password", v)}
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
          {mode === "register" && (
            <>
              <div className="text-[11px] text-neutral-500 -mt-2 pl-1">
                <div className="font-medium text-neutral-700 mb-1">{t("pro.password.rules.title")}</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>{t("pro.password.rules.length")}</li>
                  <li>{t("pro.password.rules.upper")}</li>
                  <li>{t("pro.password.rules.lower")}</li>
                  <li>{t("pro.password.rules.digit")}</li>
                </ul>
              </div>
              <PasswordField
                label={t("pro.field.passwordConfirm")}
                value={form.passwordConfirm}
                onChange={(v) => update("passwordConfirm", v)}
                show={showPasswordConfirm}
                onToggleShow={() => setShowPasswordConfirm((s) => !s)}
                autoComplete="new-password"
              />

              {/* Consensi */}
              <div className="space-y-2.5 pt-1">
                <Checkbox
                  label={t("pro.consent.privacy") + " *"}
                  checked={form.acceptsPrivacy}
                  onChange={(v) => update("acceptsPrivacy", v)}
                />
                <Checkbox
                  label={t("pro.consent.marketing")}
                  checked={form.marketingOptIn}
                  onChange={(v) => update("marketingOptIn", v)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white text-[12px] tracking-[0.18em] uppercase font-semibold py-4 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t(mode === "register" ? "pro.cta.register" : "pro.cta.login")}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="block w-full text-center text-[12px] tracking-[0.08em] text-neutral-600 hover:text-neutral-900 underline underline-offset-4 mt-2"
          >
            {t(mode === "login" ? "pro.cta.toRegister" : "pro.cta.toLogin")}
          </button>
        </form>
      </aside>
    </>
  );
}

function Field({ label, type = "text", required, value, onChange, autoComplete }: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-1.5">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full border border-neutral-200 focus:border-neutral-900 outline-none px-3 py-2.5 text-[14px]"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow, autoComplete }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-1.5">
        {label}<span className="text-red-500"> *</span>
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="w-full border border-neutral-200 focus:border-neutral-900 outline-none px-3 py-2.5 pr-10 text-[14px]"
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-900"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-neutral-700">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-4 h-4 border-2 shrink-0 flex items-center justify-center transition-colors ${
          checked ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 hover:border-neutral-500"
        }`}
        aria-pressed={checked}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </label>
  );
}
