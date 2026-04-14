"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { Globe, Loader2, Check, AlertCircle } from "lucide-react";
import { TranslationProvider } from "@/contexts/TranslationContext";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  urlPrefix: string | null;
}

interface Props {
  entity: string;
  entityId?: string;
  children: ReactNode;
}

interface Toast { message: string; type: "success" | "error" }

export default function EntityTranslationShell({ entity, entityId, children }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultCode, setDefaultCode] = useState<string>("it");
  const [active, setActive] = useState<string>("it");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setLanguages(data.data);
          const def = (data.data as Language[]).find((l) => l.isDefault) || data.data[0];
          if (def) {
            setDefaultCode(def.code);
            setActive(def.code);
          }
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-warm-500 flex items-center gap-2 mb-4">
        <Loader2 size={14} className="animate-spin" /> Caricamento lingue…
      </div>
    );
  }

  return (
    <TranslationProvider
      entity={entity}
      entityId={entityId}
      defaultLang={defaultCode}
      initialLang={active}
      onToast={showToast}
    >
      <ShellInner
        languages={languages}
        active={active}
        setActive={setActive}
        defaultCode={defaultCode}
        entityId={entityId}
        toast={toast}
      >
        {children}
      </ShellInner>
    </TranslationProvider>
  );
}

interface InnerProps {
  languages: Language[];
  active: string;
  setActive: (l: string) => void;
  defaultCode: string;
  entityId?: string;
  toast: Toast | null;
  children: ReactNode;
}

function ShellInner({ languages, active, setActive, defaultCode, entityId, toast, children }: InnerProps) {
  // Bridge: when local active changes, propagate to context via a small hook
  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <LangBridge active={active} />

      <div className="bg-white rounded-xl border border-warm-200 p-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 uppercase tracking-wider">
          <Globe size={14} /> Lingua
        </div>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag ? `${l.flag} ` : ""}{l.name}{l.isDefault ? " (principale)" : ""}
            </option>
          ))}
        </select>
        {active !== defaultCode && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
            Stai modificando la traduzione <strong>{active.toUpperCase()}</strong>.
            I campi traducibili mostrano la versione in {active.toUpperCase()};
            premi <strong>Aggiorna</strong> per salvare la traduzione.
          </span>
        )}
        {active !== defaultCode && !entityId && (
          <span className="text-xs text-red-700">Salva prima la versione {defaultCode.toUpperCase()}.</span>
        )}
      </div>

      {children}
    </div>
  );
}

// Tiny component that pushes the parent-state lang into the TranslationContext
function LangBridge({ active }: { active: string }) {
  const ctx = useTranslationCtxOrNull();
  useEffect(() => {
    if (ctx && ctx.lang !== active) ctx.setLang(active);
  }, [active, ctx]);
  return null;
}

import { useTranslationCtx } from "@/contexts/TranslationContext";
function useTranslationCtxOrNull() {
  return useTranslationCtx();
}
