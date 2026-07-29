"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Lock, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";

import { buildDownloadUrl } from "@/lib/download-url";
interface DocItem {
  key: string;
  label: string;
  url: string;
}

export default function ProductDocsList({ items }: { items: DocItem[] }) {
  const t = useT();
  const lang = useLang();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<DocItem | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect stato login riusando endpoint del contatore notifiche
  // (ritorna 200 con { success: true } se loggato, { success: false } se no).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/area-professionisti/notifications/unread-count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        setIsLoggedIn(!!j?.success);
      })
      .catch(() => { if (!cancelled) setIsLoggedIn(false); });
    return () => { cancelled = true; };
  }, []);

  const triggerDownload = useCallback((url: string, filename?: string) => {
    const a = document.createElement("a");
    a.href = buildDownloadUrl(url, filename);
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    // 'download' attribute for local files; per URL cross-origin il browser
    // decide se scaricare o aprire — accettabile sia comportamento.
    a.download = url.split("/").pop() || "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const onClickRow = useCallback((doc: DocItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) {
      triggerDownload(doc.url, doc.label);
      return;
    }
    setPendingDoc(doc);
    setShowLogin(true);
    setError(null);
  }, [isLoggedIn, triggerDownload]);

  const closeLogin = () => {
    setShowLogin(false);
    setEmail("");
    setPassword("");
    setError(null);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/professionals/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data?.error || t("pro.error.credentials"));
        return;
      }
      // Login OK — chiudo modal e scarico
      setIsLoggedIn(true);
      const toDl = pendingDoc;
      closeLogin();
      if (toDl) triggerDownload(toDl.url, toDl.label);
    } catch {
      setError(t("pro.error.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      <ul className="divide-y divide-warm-200 border-t border-b border-warm-200">
        {items.map((doc) => (
          <li key={doc.key}>
            <button
              type="button"
              onClick={(e) => onClickRow(doc, e)}
              className="w-full flex items-center justify-between py-4 px-2 hover:bg-warm-50/60 transition-colors group text-left"
              aria-label={`${doc.label} — scarica`}
            >
              <span className="uppercase text-[15px] md:text-[16px] tracking-[0.08em] text-warm-900 font-light">
                {doc.label}
              </span>
              <span className="inline-flex items-center gap-3 flex-shrink-0">
                <Download size={18} className="text-warm-800 group-hover:text-warm-900" strokeWidth={1.4} />
                <Lock size={16} className="text-warm-700" strokeWidth={1.4} aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {showLogin && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={closeLogin}
        >
          <div
            className="bg-white w-full max-w-md p-6 md:p-8 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLogin}
              className="absolute top-3 right-3 p-1.5 text-warm-500 hover:text-warm-900"
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>

            <h3 className="uppercase text-[15px] md:text-[16px] tracking-[0.12em] text-warm-900 font-medium mb-1">
              {t("pro.download.title") || "Accedi per scaricare"}
            </h3>
            <p className="text-sm text-warm-600 mb-5">
              {t("pro.download.desc") || "Accedi con il tuo account per scaricare il file."}
            </p>

            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-warm-700 mb-1.5">
                  {t("pro.field.email") || "Indirizzo E-mail"} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-warm-300 px-3 py-2.5 text-sm focus:border-warm-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-warm-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-warm-300 px-3 py-2.5 pr-10 text-sm focus:border-warm-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-warm-500 hover:text-warm-900"
                    aria-label={showPwd ? "Nascondi password" : "Mostra password"}
                  >
                    {/* eye emoji fallback */}
                    <span className="text-lg leading-none">{showPwd ? "🙈" : "👁"}</span>
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-warm-900 text-white uppercase text-sm tracking-[0.12em] py-3 hover:bg-black transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("pro.button.login") || "Accedi"}
              </button>
            </form>

            <p className="mt-4 text-sm text-warm-600">
              {t("pro.download.no_account") || "Non hai un account?"}{" "}
              <Link
                href={localizePath("/area-professionisti/accesso?mode=register", lang)}
                onClick={closeLogin}
                className="text-warm-900 underline underline-offset-2 hover:no-underline"
              >
                {t("pro.download.create") || "Crea il tuo"}
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
