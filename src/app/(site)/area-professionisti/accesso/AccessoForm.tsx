"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";
import { useT, useLang } from "@/contexts/I18nContext";

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

/** Form login + registrazione professionisti — versione "pagina dedicata" del
 *  vecchio drawer. Layout più ariso, scelta ruolo a card grandi. */
export default function AccessoForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const t = useT();
  const lang = useLang();
  const { executeRecaptcha } = useRecaptcha();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const validatePassword = (pwd: string): boolean =>
    pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
        if (res.status === 409) setError(t("pro.error.duplicateEmail"));
        else if (res.status === 401) setError(t("pro.error.credentials"));
        else if (res.status === 403) setError(t("pro.error.disabled"));
        else setError(data.error || t("pro.error.generic"));
        return;
      }
      // Successo → la pagina riservata (mantiene il prefisso lingua corrente).
      const prefix = lang === "it" ? "" : `/${lang}`;
      window.location.href = `${prefix}/area-professionisti`;
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
    <div className="max-w-4xl mx-auto px-6 lg:px-8">
      {/* Header pagina */}
      <header className="mb-10 lg:mb-14">
        <div className="text-[11px] uppercase tracking-[0.2em] text-warm-500 mb-3">
          {t("pro.header.link")}
        </div>
        <h1 className="text-3xl md:text-5xl font-serif text-warm-900 tracking-tight">
          {t(mode === "login" ? "pro.drawer.title.login" : "pro.drawer.title.register")}
        </h1>
        <p className="text-[15px] md:text-base text-warm-600 mt-3 leading-relaxed max-w-2xl">
          {t(mode === "login" ? "pro.drawer.subtitle.login" : "pro.drawer.subtitle.register")}
        </p>

        {/* Tabs */}
        <div className="flex gap-8 mt-8 border-b border-warm-200">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`pb-3 text-[12px] tracking-[0.18em] uppercase transition-colors border-b-2 -mb-px ${
              mode === "login"
                ? "text-warm-900 border-warm-900 font-semibold"
                : "text-warm-400 border-transparent hover:text-warm-700"
            }`}
          >
            {t("pro.drawer.tab.login")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`pb-3 text-[12px] tracking-[0.18em] uppercase transition-colors border-b-2 -mb-px ${
              mode === "register"
                ? "text-warm-900 border-warm-900 font-semibold"
                : "text-warm-400 border-transparent hover:text-warm-700"
            }`}
          >
            {t("pro.drawer.tab.register")}
          </button>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={submit} className="space-y-7 max-w-2xl">
        {mode === "register" && (
          <>
            {/* Selezione ruolo */}
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-4">
                {t("pro.role.label")} <span className="text-red-500">*</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => {
                  const active = form.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("role", opt.value)}
                      className={`text-left p-4 border transition-colors ${
                        active
                          ? "border-warm-900 bg-warm-50"
                          : "border-warm-200 hover:border-warm-400"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          active ? "border-warm-900" : "border-warm-300"
                        }`}>
                          {active && <span className="w-2 h-2 rounded-full bg-warm-900" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-warm-900 leading-tight">{t(opt.titleKey)}</div>
                          <div className="text-[12px] text-warm-500 mt-1.5 leading-relaxed">{t(opt.descKey)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("pro.field.firstName")} required value={form.firstName} onChange={(v) => update("firstName", v)} />
              <Field label={t("pro.field.lastName")} required value={form.lastName} onChange={(v) => update("lastName", v)} />
            </div>
          </>
        )}

        <Field
          label={t("pro.field.email")}
          type="email"
          required
          value={form.email}
          onChange={(v) => update("email", v)}
          autoComplete="email"
        />

        {mode === "register" && (
          <>
            <Field label={t("pro.field.phone")} type="tel" value={form.phone} onChange={(v) => update("phone", v)} autoComplete="tel" />
            <Field label={t("pro.field.company")} required value={form.company} onChange={(v) => update("company", v)} />
          </>
        )}

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
            <div className="text-[12px] text-warm-500 -mt-3 pl-1">
              <div className="font-medium text-warm-700 mb-1">{t("pro.password.rules.title")}</div>
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

            <div className="space-y-3 pt-2">
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
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 px-4 py-3">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 bg-warm-900 hover:bg-black text-white text-[12px] tracking-[0.18em] uppercase font-semibold px-12 py-4 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t(mode === "register" ? "pro.cta.register" : "pro.cta.login")}
          </button>
        </div>

        <div className="pt-4 border-t border-warm-200">
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-[13px] text-warm-700 hover:text-warm-900 transition-colors"
            style={{ textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}
          >
            <span className="hover:underline">{t(mode === "login" ? "pro.cta.toRegister" : "pro.cta.toLogin")}</span>
          </button>
        </div>
      </form>
    </div>
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
      <label className="block text-[11px] uppercase tracking-[0.12em] text-warm-500 mb-2">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full border border-warm-200 focus:border-warm-900 outline-none px-3 py-3 text-[15px] bg-white"
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
      <label className="block text-[11px] uppercase tracking-[0.12em] text-warm-500 mb-2">
        {label}<span className="text-red-500"> *</span>
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="w-full border border-warm-200 focus:border-warm-900 outline-none px-3 py-3 pr-10 text-[15px] bg-white"
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-warm-400 hover:text-warm-900"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-[13px] text-warm-700">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-4 h-4 border-2 shrink-0 flex items-center justify-center transition-colors ${
          checked ? "border-warm-900 bg-warm-900" : "border-warm-300 hover:border-warm-500"
        }`}
        aria-pressed={checked}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </label>
  );
}
