"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bell, FileText, FileCode, FolderOpen, Box, Camera, Image as ImageIcon, Briefcase, AlertTriangle, Shield, ExternalLink } from "lucide-react";
import BachecaTab from "./tabs/BachecaTab";
import PdfListTab from "./tabs/PdfListTab";
import PconConfigTab from "./tabs/PconConfigTab";
import MaintenanceTab from "./tabs/MaintenanceTab";
import AreaSettingsTab from "./tabs/AreaSettingsTab";
import MediaTab from "./tabs/MediaTab";

type TabKey =
  | "bacheca"
  | "tecnica"
  | "media"
  | "cataloghi"
  | "pcon"
  | "listini"
  | "press"
  | "aziendale"
  | "manutenzione"
  | "impostazioni";

const TABS: { key: TabKey; label: string; icon: React.ElementType; subtitle: string }[] = [
  { key: "bacheca",      label: "Bacheca",                       icon: Bell,            subtitle: "Novità da pubblicare ai professionisti" },
  { key: "tecnica",      label: "Informazioni tecniche",         icon: FileCode,        subtitle: "PDF + link alle schede prodotto" },
  { key: "media",        label: "Digital & Media",               icon: ImageIcon,       subtitle: "Foto, render e materiali digitali" },
  { key: "cataloghi",    label: "Cataloghi, poster e journal",   icon: FolderOpen,      subtitle: "Vai alla gestione cataloghi" },
  { key: "pcon",         label: "pCon configuratore",            icon: Box,             subtitle: "Impostazioni del configuratore pCon" },
  { key: "listini",      label: "Listini prezzi",                icon: FileText,        subtitle: "PDF visibili a Rivenditori e Agenti" },
  { key: "press",        label: "Press kit",                     icon: Camera,          subtitle: "Materiali per la stampa" },
  { key: "aziendale",    label: "Informazioni aziendali",        icon: Briefcase,       subtitle: "Vai alle impostazioni azienda" },
  { key: "manutenzione", label: "Pagina manutenzione",           icon: AlertTriangle,   subtitle: "Testi della pagina di manutenzione dell’area" },
  { key: "impostazioni", label: "Impostazioni area riservata",   icon: Shield,          subtitle: "Quali sezioni sono visibili e a chi" },
];

const VALID_TAB_KEYS: TabKey[] = ["bacheca", "tecnica", "media", "cataloghi", "pcon", "listini", "press", "aziendale", "manutenzione", "impostazioni"];

export default function ManageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as TabKey | null;
  const initialTab: TabKey = tabFromUrl && VALID_TAB_KEYS.includes(tabFromUrl) ? tabFromUrl : "bacheca";
  const [active, setActive] = useState<TabKey>(initialTab);
  useEffect(() => {
    const t = searchParams.get("tab") as TabKey | null;
    const next: TabKey = t && VALID_TAB_KEYS.includes(t) ? t : "bacheca";
    if (next !== active) setActive(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const switchTab = useCallback((t: TabKey) => {
    setActive(t);
    router.replace(`${pathname}?tab=${t}`, { scroll: false });
  }, [router, pathname]);

  const activeMeta = TABS.find((t) => t.key === active)!;
  const ActiveIcon = activeMeta.icon;

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Vertical tabs (desktop) / Horizontal pills (mobile) */}
        <nav className="md:w-64 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => switchTab(t.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-left ${
                    isActive
                      ? "bg-warm-800 text-white"
                      : "text-warm-600 hover:bg-warm-100 hover:text-warm-800"
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Sezione attiva: titolo+sottotitolo sul background (no strip grigia) */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-warm-800 text-white flex items-center justify-center flex-shrink-0">
              <ActiveIcon size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-warm-800">{activeMeta.label}</h2>
              <p className="text-sm text-warm-500 mt-0.5">{activeMeta.subtitle}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
            {active === "bacheca" && <BachecaTab />}

            {active === "tecnica" && (
              <div className="space-y-6">
                <PdfListTab
                  section="informazioni-tecniche"
                  title="PDF generali e tecnici (cura, manutenzione, certificazioni)"
                  description={"I PDF caricati qui appariranno nell’area professionisti alla sezione “Informazioni tecniche”. Sono GENERALI (non legati a un singolo prodotto)."}
                  embedded
                />
                <div className="border border-warm-200 bg-warm-50/50 rounded-lg p-4">
                  <div className="text-sm font-medium text-warm-800 mb-1">Schede tecniche per singolo prodotto</div>
                  <div className="text-xs text-warm-500 mb-3">
                    Per caricare 2D, 3D, scheda tecnica e istruzioni di montaggio di un prodotto specifico, vai alla pagina del prodotto e usa la sezione “Documentazione”.
                  </div>
                  <Link
                    href="/admin/products"
                    className="inline-flex items-center gap-1.5 text-sm text-warm-800 border border-warm-300 hover:bg-warm-100 px-3 py-1.5 rounded"
                  >
                    Vai alla gestione prodotti <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            )}

            {active === "media" && <MediaTab />}

            {active === "cataloghi" && (
              <RedirectCard
                title="Cataloghi, poster e journal"
                description={"Per gestire i cataloghi (cataloghi prodotti, monografie, slow living magazine, poster) c’è una sezione dedicata."}
                href="/admin/catalogs"
                cta="Apri Cataloghi"
              />
            )}

            {active === "pcon" && <PconConfigTab />}

            {active === "listini" && (
              <PdfListTab
                section="listini-prezzi"
                title="Listini prezzi"
                description={"I PDF caricati qui appariranno nell’area professionisti alla voce “Listino prezzi” (visibili a Rivenditori e Agenti)."}
              />
            )}

            {active === "press" && (
              <PdfListTab
                section="press-kit"
                title="Press kit"
                description={"Carica qui i PDF che vuoi rendere disponibili nella sezione “Press kit” dell’area professionisti (visibile principalmente al ruolo Stampa)."}
              />
            )}

            {active === "aziendale" && (
              <RedirectCard
                title="Informazioni aziendali"
                description={"I dati dell’azienda (nome, descrizione, loghi, contatti, P.IVA) sono gestiti nella pagina “Impostazioni del sito” → tab “Azienda”."}
                href="/admin/settings?tab=azienda"
                cta="Apri Impostazioni del sito → Azienda"
              />
            )}

            {active === "manutenzione" && <MaintenanceTab />}

            {active === "impostazioni" && <AreaSettingsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function RedirectCard({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <div className="text-center py-8">
      <h3 className="text-lg font-medium text-warm-800 mb-2">{title}</h3>
      <p className="text-sm text-warm-600 mb-5 max-w-md mx-auto">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
      >
        {cta} <ExternalLink size={14} />
      </Link>
    </div>
  );
}
