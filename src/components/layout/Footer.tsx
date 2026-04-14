"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";
import { useRecaptcha } from "@/components/providers/RecaptchaProvider";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const DEFAULT_NEWSLETTER_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "Nome", type: "text", required: true, enabled: true, order: 0 },
  { key: "lastName", label: "Cognome", type: "text", required: true, enabled: true, order: 1 },
  { key: "email", label: "Email", type: "email", required: true, enabled: true, order: 2 },
  { key: "company", label: "Azienda", type: "text", required: false, enabled: false, order: 3 },
  { key: "phone", label: "Telefono", type: "tel", required: false, enabled: false, order: 4 },
  { key: "acceptsPrivacy", label: "Accetto la privacy policy", type: "checkbox", required: true, enabled: true, order: 5 },
  { key: "acceptsUpdates", label: "Desidero ricevere aggiornamenti e novità", type: "checkbox", required: false, enabled: true, order: 6 },
];

export default function Footer() {
  const t = useT();
  const lang = useLang();
  const [fieldConfig, setFieldConfig] = useState<FieldConfig[] | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [subscribed, setSubscribed] = useState(false);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    fetch("/api/form-configs/public?type=newsletter")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) setFieldConfig(data.data);
      })
      .catch(() => {});
  }, []);

  const activeConfig = (fieldConfig || DEFAULT_NEWSLETTER_FIELDS)
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!activeConfig || activeConfig.length === 0) return;
    const initial: Record<string, string | boolean> = {};
    activeConfig.forEach((f) => {
      initial[f.key] = f.type === "checkbox" ? true : "";
    });
    setFormData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldConfig]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require at least email
    if (!formData.email) return;
    try {
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("newsletter_subscribe");
      }
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email || "",
          firstName: formData.firstName || "",
          lastName: formData.lastName || "",
          company: formData.company || undefined,
          phone: formData.phone || undefined,
          recaptchaToken,
          acceptsPrivacy: !!formData.acceptsPrivacy,
          acceptsUpdates: !!formData.acceptsUpdates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
      }
    } catch {
      // silently fail
    }
  };

  const textFields = activeConfig.filter((f) => f.type !== "checkbox");
  const checkboxFields = activeConfig.filter((f) => f.type === "checkbox");

  return (
    <footer className="bg-white">
      {/* Newsletter section — horizontal layout */}
      <div className="mt-4" style={{ borderTop: "0.5px solid black" }}>
        <div className="mx-auto w-full max-w-[1420px] px-4 md:px-8 py-14 md:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <div>
              <h3 className="font-sans text-[28px] font-light uppercase tracking-[inherit] leading-[1.15] text-black">
                Per gli amanti del design
              </h3>
              <p className="font-sans text-[16px] font-light mt-0.5 text-black">
                Ricevi novità e ispirazioni in esclusiva.
              </p>
            </div>
            <div>
              {subscribed ? (
                <p className="text-sm" style={{ color: "#eb5b27" }}>Grazie per l&apos;iscrizione!</p>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  {/* Text/email fields in rows of 2 */}
                  {textFields.length > 0 && (
                    <>
                      {(() => {
                        const rows: React.ReactNode[] = [];
                        for (let i = 0; i < textFields.length; i += 2) {
                          if (i + 1 < textFields.length) {
                            rows.push(
                              <div key={`row-${textFields[i].key}-${textFields[i + 1].key}`} className="grid grid-cols-2 gap-3">
                                {[textFields[i], textFields[i + 1]].map((field) => (
                                  <div key={field.key}>
                                    <label className="block font-sans text-[14px] font-light mb-1 text-black">
                                      {field.label} {field.required && "*"}
                                    </label>
                                    <input
                                      type={field.type}
                                      value={(formData[field.key] as string) || ""}
                                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                      placeholder={field.label}
                                      className="w-full border border-neutral-300 bg-transparent px-4 py-2.5 font-sans text-[14px] font-light placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                                      style={{ color: "#000" }}
                                      required={field.required}
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            const field = textFields[i];
                            rows.push(
                              <div key={`row-${field.key}`}>
                                <label className="block font-sans text-[14px] font-light mb-1 text-black">
                                  {field.label} {field.required && "*"}
                                </label>
                                <input
                                  type={field.type}
                                  value={(formData[field.key] as string) || ""}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  placeholder={field.label}
                                  className="w-full border border-neutral-300 bg-transparent px-4 py-2.5 font-sans text-[14px] font-light placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                                  style={{ color: "#000" }}
                                  required={field.required}
                                />
                              </div>
                            );
                          }
                        }
                        return rows;
                      })()}
                    </>
                  )}
                  {/* Checkboxes below */}
                  {checkboxFields.length > 0 && (
                    <div className="space-y-2">
                      {checkboxFields.map((field) => {
                        if (field.key === "acceptsPrivacy") {
                          return (
                            <label key={field.key} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!formData[field.key]}
                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                                className="mt-0.5"
                                required={field.required}
                              />
                              <span className="text-xs" style={{ color: "#757f80" }}>
                                Accetto la{" "}
                                <Link href="/privacy-policy" className="underline" style={{ color: "#000" }}>privacy policy</Link> *
                              </span>
                            </label>
                          );
                        }
                        return (
                          <label key={field.key} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!formData[field.key]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                              className="mt-0.5"
                            />
                            <span className="text-xs" style={{ color: "#757f80" }}>{field.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full border border-black py-2.5 text-sm uppercase tracking-[0.03em]"
                    style={{ color: "#000" }}
                  >
                    Iscriviti
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="w-full" style={{ borderTop: "0.5px solid black" }} />

      {/* Logo */}
      <div className="mx-auto w-full max-w-[1420px] px-4 md:px-8 pt-14 md:pt-18">
        <Logo width={80} height={66} />
      </div>

      {/* Main footer content */}
      <div className="mx-auto w-full max-w-[1420px] px-4 md:px-8 pt-18 pb-14 md:pb-18">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Company info */}
          <div className="lg:w-[40%] space-y-6">
            <div className="space-y-5 text-[14px] font-normal leading-snug" style={{ color: "#000" }}>
              <div>
                <p className="font-bold text-[16px]" style={{ color: "#000" }}>
                  Headquarters Gebrüder Thonet Vienna GmbH
                </p>
                <p>Via Foggia 23H – 10125 Torino (Italy)</p>
                <p>T. +39 0110133330</p>
                <Link href="mailto:info@gebruederthonetvienna.com" className="underline hover:no-underline">
                  info@gebruederthonetvienna.com
                </Link>
              </div>

              <div>
                <p className="font-bold text-[16px]" style={{ color: "#000" }}>
                  Registered Office Gebrüder Thonet Vienna GmbH
                </p>
                <p>Prinz Eugen Strasse 42 1040 Wien Österreich</p>
              </div>

              <div>
                <p className="font-bold text-[16px]" style={{ color: "#000" }}>
                  Offices of the trademarks licencee
                </p>
                <p>Production Furniture International S.p.A</p>
                <p>Via Vincenzo Vela 35/B – 10128 Torino (Italy)</p>
                <p>Codice Fiscale: 08743760012 – REA: TO-997261</p>
              </div>
            </div>

            {/* Language selector */}
            <div className="pt-4">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Link columns — pushed to right */}
          <div className="lg:flex-1 flex flex-col md:flex-row gap-[6.5rem] lg:justify-end">
          {/* Esplora */}
          <div>
            <h4 className="text-[16px] font-bold uppercase tracking-[0.05em] mb-8" style={{ color: "#000" }}>
              Esplora
            </h4>
            <ul className="space-y-6">
              <li>
                <Link href={localizePath("/prodotti", lang)} className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  {t("menu.products")}
                </Link>
              </li>
              <li>
                <Link href={localizePath("/progetti", lang)} className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  {t("menu.projects")}
                </Link>
              </li>
              <li>
                <Link href={localizePath("/mondo-gtv", lang)} className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  {t("menu.world")}
                </Link>
              </li>
              <li>
                <Link href={localizePath("/professionisti", lang)} className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  {t("menu.professionals")}
                </Link>
              </li>
              <li>
                <Link href={localizePath("/contatti", lang)} className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  {t("menu.contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Informati */}
          <div>
            <h4 className="text-[16px] font-bold uppercase tracking-[0.05em] mb-8" style={{ color: "#000" }}>
              Informati
            </h4>
            <ul className="space-y-6">
              <li>
                <Link href="/privacy-policy" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/condizioni-vendita" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all leading-snug" style={{ color: "#000" }}>
                  Condizioni Generali<br />di Vendita
                </Link>
              </li>
            </ul>
          </div>

          {/* Seguici */}
          <div>
            <h4 className="text-[16px] font-bold uppercase tracking-[0.05em] mb-8" style={{ color: "#000" }}>
              Seguici
            </h4>
            <ul className="space-y-6">
              <li>
                <Link href="https://www.facebook.com/GebruderThonetVienna" target="_blank" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  Facebook
                </Link>
              </li>
              <li>
                <Link href="https://www.instagram.com/gebruder_thonet_vienna/" target="_blank" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  Instagram
                </Link>
              </li>
              <li>
                <Link href="https://it.pinterest.com/gebruder_thonet_vienna/_created/" target="_blank" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  Pinterest
                </Link>
              </li>
              <li>
                <Link href="https://www.linkedin.com/company/gebruder-thonet-vienna/" target="_blank" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  LinkedIn
                </Link>
              </li>
              <li>
                <Link href="https://www.youtube.com/@Gebr%C3%BCderThonetVienna" target="_blank" className="text-[16px] uppercase tracking-[0.03em] font-normal hover:underline transition-all" style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}>
                  YouTube
                </Link>
              </li>
            </ul>
          </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="mx-auto w-full max-w-[1420px] px-4 md:px-8 pb-[9.9rem] pt-16 md:pt-24">
        <p className="text-[14px] font-normal leading-relaxed" style={{ color: "#000" }}>
          Copyright 2025 © GEBRUDER THONET VIENNA GMBH
        </p>
        <p className="text-[13px] font-normal leading-[1.4] mt-3 max-w-3xl" style={{ color: "#000" }}>
          Si prega di osservare che l&apos;utilizzo del marchio e il nome della società &ldquo;Gebrüder Thonet Vienna&rdquo; negli
          Stati Uniti e l&apos;uso del marchio di fabbrica &ldquo;Gebrüder Thonet Vienna&rdquo; in Germania comporta restrizioni,
          a causa di accordi stipulati con altre imprese. Per ulteriori informazioni si prega di contattare info@gebruederthonetvienna.it.
        </p>
      </div>
    </footer>
  );
}
