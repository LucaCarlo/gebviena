"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, FileText, Camera, Image as ImageIcon, FileCode, Briefcase, FolderOpen, ExternalLink } from "lucide-react";
import BachecaTab from "./tabs/BachecaTab";
import PdfListTab from "./tabs/PdfListTab";
import PlaceholderTab from "./tabs/PlaceholderTab";

type TabKey = "bacheca" | "listini" | "press" | "media" | "tecnica" | "aziendale" | "cataloghi";

const TABS: { key: TabKey; label: string; icon: React.ElementType; subtitle: string }[] = [
  { key: "bacheca",   label: "Bacheca",                icon: Bell,        subtitle: "Novità da pubblicare ai professionisti" },
  { key: "listini",   label: "Listini prezzi",         icon: FileText,    subtitle: "PDF visibili a Rivenditori e Agenti" },
  { key: "press",     label: "Press kit",              icon: Camera,      subtitle: "Materiali per la stampa" },
  { key: "media",     label: "Media",                  icon: ImageIcon,   subtitle: "Foto, render, digital assets" },
  { key: "tecnica",   label: "Informazioni tecniche", icon: FileCode,    subtitle: "PDF + link alle schede prodotto" },
  { key: "aziendale", label: "Informazioni aziendali", icon: Briefcase,   subtitle: "Vai alle impostazioni azienda" },
  { key: "cataloghi", label: "Cataloghi",              icon: FolderOpen,  subtitle: "Vai alla gestione cataloghi" },
];

export default function ManageClient() {
  const [active, setActive] = useState<TabKey>("bacheca");
  const activeMeta = TABS.find((t) => t.key === active)!;
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Vertical tabs (desktop) / Horizontal pills (mobile) */}
      <nav className="md:w-60 flex-shrink-0">
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
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
      <div className="flex-1 min-w-0">
        <section className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-200 bg-warm-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warm-900 text-white flex items-center justify-center">
              <ActiveIcon size={16} />
            </div>
            <div>
              <div className="font-medium text-warm-900">{activeMeta.label}</div>
              <div className="text-xs text-warm-500">{activeMeta.subtitle}</div>
            </div>
          </div>
          <div className="p-6">
            {active === "bacheca" && <BachecaTab />}
            {active === "listini" && (
              <PdfListTab
                section="listini-prezzi"
                title="Listini prezzi"
                description={"I PDF caricati qui appariranno nell’area professionisti alla voce “Listino prezzi” (visibili a Rivenditori e Agenti)."}
              />
            )}
            {active === "press" && (
              <PlaceholderTab title="Press kit — in lavorazione" description="Sezione in fase di definizione. Verrà attivata appena decideremo cosa caricare." />
            )}
            {active === "media" && (
              <PlaceholderTab title="Media — in lavorazione" description="Sezione in fase di definizione. Verrà attivata appena decideremo cosa caricare." />
            )}
            {active === "tecnica" && (
              <div className="space-y-6">
                <PdfListTab
                  section="informazioni-tecniche"
                  title="PDF manutenzione e tecnici"
                  description={"PDF generali (es. manutenzione cura del legno, certificazioni) che appariranno nella sezione “Informazioni tecniche” dell’area professionisti."}
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
            {active === "aziendale" && (
              <RedirectCard
                title="Informazioni aziendali"
                description={"I dati dell’azienda (sede, contatti, P.IVA) sono gestiti nella pagina “Impostazioni Store” → tab “Generale”."}
                href="/admin/store/settings"
                cta="Apri Impostazioni Store"
              />
            )}
            {active === "cataloghi" && (
              <RedirectCard
                title="Cataloghi"
                description={"Per gestire i cataloghi (cataloghi prodotti, monografie, slow living magazine) c’è una sezione dedicata."}
                href="/admin/catalogs"
                cta="Apri Cataloghi"
              />
            )}
          </div>
        </section>
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
