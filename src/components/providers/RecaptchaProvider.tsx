"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

interface RecaptchaContextType {
  executeRecaptcha: ((action: string) => Promise<string>) | null;
  ready: boolean;
}

const RecaptchaContext = createContext<RecaptchaContextType>({
  executeRecaptcha: null,
  ready: false,
});

export function useRecaptcha() {
  return useContext(RecaptchaContext);
}

declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

export default function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const [siteKey, setSiteKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Fetch public settings to get recaptcha config
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const isEnabled = data.data.recaptcha_enabled === "true";
          const key = data.data.recaptcha_site_key || "";
          setEnabled(isEnabled);
          setSiteKey(key);

          if (isEnabled && key && !scriptLoaded.current) {
            scriptLoaded.current = true;
            const script = document.createElement("script");
            script.src = `https://www.google.com/recaptcha/enterprise.js?render=${key}`;
            script.async = true;
            script.onload = () => {
              window.grecaptcha?.enterprise.ready(() => {
                setReady(true);
              });
            };
            document.head.appendChild(script);
          }
        }
      })
      .catch(() => {
        // silently fail — recaptcha just won't be active
      });
  }, []);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      if (!enabled || !siteKey) return "";
      // Aspetta che enterprise.js sia caricato (no race se l'utente invia
      // subito): poll fino a ~7s, poi grecaptcha.enterprise.ready, poi execute.
      const start = Date.now();
      while (!window.grecaptcha?.enterprise && Date.now() - start < 7000) {
        await new Promise((r) => setTimeout(r, 150));
      }
      const ge = window.grecaptcha?.enterprise;
      if (!ge) return "";
      try {
        await new Promise<void>((res) => ge.ready(() => res()));
        return await ge.execute(siteKey, { action });
      } catch {
        return "";
      }
    },
    [enabled, siteKey]
  );

  return (
    <RecaptchaContext.Provider
      value={{
        executeRecaptcha: enabled && siteKey ? executeRecaptcha : null,
        ready,
      }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}
