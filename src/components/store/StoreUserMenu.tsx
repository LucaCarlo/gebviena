"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, LogIn, LogOut, Heart, Package, UserCircle, Globe, Check } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useLang } from "@/contexts/I18nContext";
import { switchStoreLang } from "@/lib/store-lang-switch";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isActive: boolean;
}

/**
 * Dropdown utente per lo store: clic sull'icona User → menu con
 *  - link area riservata / preferiti / ordini (se loggato)
 *  - oppure login / registrazione (se ospite)
 *  - sotto-sezione "Lingua" con tutte le lingue attive
 *
 * Sostituisce il vecchio link diretto a /account, che era poco scopribile
 * per il cambio lingua.
 */
export default function StoreUserMenu() {
  const { customer, refresh } = useCustomerAuth();
  const currentLang = useLang();
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          // Lo store è solo IT/FR — non mostriamo altre lingue qui.
          setLanguages(d.data.filter((l: Language) => l.isActive && ["it", "fr"].includes(l.code)));
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const switchLang = (code: string) => {
    setOpen(false);
    switchStoreLang(code);
  };

  const logout = async () => {
    setOpen(false);
    try { await fetch("/api/store/public/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    await refresh();
  };

  const isFr = currentLang === "fr";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={customer ? (customer.email || "Account") : (isFr ? "Mon compte" : "Account")}
        className="p-1 text-neutral-700 hover:text-neutral-900 transition-colors inline-flex"
      >
        <User size={20} strokeWidth={1.6} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-neutral-200 shadow-lg z-[80]">
          {customer ? (
            <>
              <div className="px-4 py-3 border-b border-neutral-100">
                <div className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">{isFr ? "Connecté" : "Connesso"}</div>
                <div className="text-sm text-neutral-900 truncate mt-0.5">{customer.firstName} {customer.lastName}</div>
                <div className="text-[11px] text-neutral-500 truncate">{customer.email}</div>
              </div>
              <MenuLink href="/account" icon={<UserCircle size={14} />} label={isFr ? "Mon espace" : "Area riservata"} onNavigate={() => setOpen(false)} />
              <MenuLink href="/account/orders" icon={<Package size={14} />} label={isFr ? "Mes commandes" : "I miei ordini"} onNavigate={() => setOpen(false)} />
              <MenuLink href="/account/favorites" icon={<Heart size={14} />} label={isFr ? "Favoris" : "Preferiti"} onNavigate={() => setOpen(false)} />
              <button onClick={logout} className="w-full px-4 py-2.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors inline-flex items-center gap-2 border-t border-neutral-100">
                <LogOut size={14} /> {isFr ? "Déconnexion" : "Esci"}
              </button>
            </>
          ) : (
            <>
              <MenuLink href="/account" icon={<LogIn size={14} />} label={isFr ? "Connexion" : "Accedi"} onNavigate={() => setOpen(false)} />
              <MenuLink href="/account" icon={<User size={14} />} label={isFr ? "Créer un compte" : "Registrati"} onNavigate={() => setOpen(false)} />
            </>
          )}

          {languages.length > 1 && (
            <div className="border-t border-neutral-100">
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-neutral-500 inline-flex items-center gap-1.5">
                <Globe size={11} /> {isFr ? "Langue" : "Lingua"}
              </div>
              <div className="pb-2">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLang(l.code)}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-neutral-50 transition-colors inline-flex items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-2">
                      {l.flag && <span>{l.flag}</span>}
                      <span className={l.code === currentLang ? "text-neutral-900 font-medium" : "text-neutral-700"}>{l.name}</span>
                    </span>
                    {l.code === currentLang && <Check size={13} className="text-neutral-900" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onNavigate }: { href: string; icon: React.ReactNode; label: string; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="w-full px-4 py-2.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors inline-flex items-center gap-2"
    >
      {icon} {label}
    </Link>
  );
}
