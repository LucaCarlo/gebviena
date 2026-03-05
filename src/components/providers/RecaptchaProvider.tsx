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
      if (!enabled || !siteKey || !ready || !window.grecaptcha) {
        return "";
      }
      try {
        return await window.grecaptcha.enterprise.execute(siteKey, { action });
      } catch {
        return "";
      }
    },
    [enabled, siteKey, ready]
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
