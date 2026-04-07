"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden",
  "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
  "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

interface LandingConfig {
  id: string;
  heroTitle: string;
  heroSubtitle: string | null;
  heroLocation: string | null;
  heroDescription: string | null;
  successTitle: string;
  successMessage: string | null;
  privacyLabel: string;
  marketingLabel: string | null;
  buttonLabel: string;
  bannerImage: string | null;
  logoImage: string | null;
  isActive: boolean;
  formFields: string | null;
}

const DEFAULT_PROFILES = [
  "Architect / Interior Designer",
  "Press",
  "Trade / Retailer",
  "Client / Collector",
  "Student",
  "Other",
];

const DEFAULT_CONFIG: LandingConfig = {
  id: "",
  heroTitle: "Milan Design Week 2026",
  heroSubtitle: "Come and experience the True Over Time Collection with us.",
  heroLocation: "Milan Flagship Store\nPalazzo Gallarati Scotti\nVia Manzoni 30",
  heroDescription: "Register to receive your QR code to show at entrance.\nThe QR code is personal and can't be shared.",
  successTitle: "Thank you. Your QR code has been generated.",
  successMessage: null,
  privacyLabel: "I have read and understood the Privacy Policy on processing of my personal data and I confirm that I am over 18.",
  marketingLabel: "I agree to receive communications and updates about GTV products and events.",
  buttonLabel: "Register",
  bannerImage: null,
  logoImage: null,
  isActive: true,
  formFields: null,
};

function getProfileOptions(config: LandingConfig): string[] {
  if (!config.formFields) return DEFAULT_PROFILES;
  try {
    const fields = JSON.parse(config.formFields);
    const profileField = fields.find((f: { key: string; options?: string[] }) => f.key === "profile");
    if (profileField?.options?.length) return profileField.options;
  } catch {}
  return DEFAULT_PROFILES;
}

export default function LandingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const permalink = params.permalink as string;
  const inviteToken = searchParams.get("inv") || "";
  const trackedRef = useRef(false);
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_CONFIG);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profile: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    privacyAccepted: false,
    marketingConsent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    fetch(`/api/landing-page-config?permalink=${permalink}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setConfig(data.data);
        }
      })
      .catch(() => {});
  }, [permalink]);

  useEffect(() => {
    if (!inviteToken || trackedRef.current) return;
    trackedRef.current = true;
    fetch(`/api/event-invitations/track?token=${inviteToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.email) {
          setForm((prev) => ({ ...prev, email: data.data.email }));
        }
      })
      .catch(() => {});
  }, [inviteToken]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim()) newErrors.lastName = "Required";
    if (!form.email.trim()) {
      newErrors.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email";
    }
    if (!form.country.trim()) newErrors.country = "Required";
    if (!form.city.trim()) newErrors.city = "Required";
    if (!form.zipCode.trim()) newErrors.zipCode = "Required";
    if (!form.privacyAccepted) newErrors.privacyAccepted = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/event-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, landingPageId: config.id, inviteToken: inviteToken || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setQrCode(data.data.qrCode);
        setQrDataUrl(data.data.qrDataUrl || "");
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(data.error || "An error occurred. Please try again.");
      }
    } catch {
      setServerError("Connection error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const profileOptions = getProfileOptions(config);

  if (!config.isActive) {
    return (
      <div className="section-padding flex items-center justify-center">
        <p className="text-warm-400 text-lg font-light">
          This page is currently not available.
        </p>
      </div>
    );
  }

  return (
    <div className="font-serif">
      {/* Banner */}
      {config.bannerImage && (
        <section className="pt-6 md:pt-10">
          <div className="mx-auto" style={{ maxWidth: "900px" }}>
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "900 / 178" }}>
              <Image
                src={config.bannerImage}
                alt="Event banner"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* Hero text — hidden after registration */}
      {!success && (
        <section className="text-center px-6 py-10 md:py-14 mx-auto" style={{ maxWidth: "600px" }}>
          <h1 className="text-[19px] text-dark font-bold mb-1">{config.heroTitle}</h1>
          {config.heroSubtitle && (
            <p className="text-[16px] text-dark font-semibold mb-6">{config.heroSubtitle}</p>
          )}
          {config.heroLocation && (
            <div className="mb-4">
              {config.heroLocation.split("\n").map((line, i) => (
                <p key={i} className="text-[15px] text-dark leading-[1.6]">{line}</p>
              ))}
            </div>
          )}
          {config.heroLocation && config.heroDescription && (
            <div className="text-dark mb-4 text-[15px]">———</div>
          )}
          {config.heroDescription && (
            <div>
              {config.heroDescription.split("\n").map((line, i) => (
                <p key={i} className="text-[15px] text-dark leading-[1.8]">{line}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Form or Success */}
      <section className="px-6 pb-20 md:pb-32">
        <div className="mx-auto" style={{ maxWidth: "600px" }}>
          {success ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-[28px] md:text-[36px] text-dark tracking-tight font-light mb-4">
                {config.successTitle}
              </h2>
              {config.successMessage && (
                <p className="text-base text-dark font-light leading-[1.8] mb-8">{config.successMessage}</p>
              )}
              {qrDataUrl && (
                <>
                  <p className="text-[13px] text-dark/60 font-light mb-4">
                    Show this code at the entrance for check-in
                  </p>
                  <div className="inline-block border border-warm-200 rounded-lg p-4 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Your QR Code" width={250} height={250} className="block" />
                  </div>
                </>
              )}
              <p className="text-[11px] text-dark/40 mt-4 font-light font-mono">
                {qrCode}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10" noValidate>
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 font-light">
                  {serverError}
                </div>
              )}

              {/* First Name */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)}
                  className={`w-full border ${errors.firstName ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1 font-light">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)}
                  className={`w-full border ${errors.lastName ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1 font-light">{errors.lastName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full border ${errors.email ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`} />
                {errors.email && <p className="text-red-500 text-xs mt-1 font-light">{errors.email}</p>}
              </div>

              {/* Profile */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  Profile <span className="text-red-500">*</span>
                </label>
                <select value={form.profile} onChange={(e) => updateField("profile", e.target.value)}
                  className={`w-full border ${errors.profile ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors cursor-pointer`}>
                  <option value="">Select...</option>
                  {profileOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  Country or Region <span className="text-red-500">*</span>
                </label>
                <select value={form.country} onChange={(e) => updateField("country", e.target.value)}
                  className={`w-full border ${errors.country ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`}>
                  <option value="">Select...</option>
                  <option value="Italy">Italy</option>
                  <option disabled>──────────</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.country && <p className="text-red-500 text-xs mt-1 font-light">{errors.country}</p>}
              </div>

              {/* State */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">State or Province</label>
                <input type="text" value={form.state} onChange={(e) => updateField("state", e.target.value)}
                  className="w-full border border-warm-200 focus:border-warm-400 rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors" />
              </div>

              {/* City */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)}
                  className={`w-full border ${errors.city ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`} />
                {errors.city && <p className="text-red-500 text-xs mt-1 font-light">{errors.city}</p>}
              </div>

              {/* ZIP */}
              <div>
                <label className="block text-[16px] font-semibold text-dark mb-2">
                  ZIP <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.zipCode} onChange={(e) => updateField("zipCode", e.target.value)}
                  className={`w-full border ${errors.zipCode ? "border-red-400" : "border-warm-200 focus:border-warm-400"} rounded-md bg-warm-50/50 px-4 py-3 text-[15px] text-dark outline-none transition-colors`} />
                {errors.zipCode && <p className="text-red-500 text-xs mt-1 font-light">{errors.zipCode}</p>}
              </div>

              {/* Divider */}
              <div className="border-t border-warm-200" />

              {/* Privacy */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => updateField("privacyAccepted", e.target.checked)}
                  className="mt-1 w-4 h-4 accent-dark shrink-0" />
                <span className={`text-xs leading-relaxed font-light ${errors.privacyAccepted ? "text-red-600" : "text-dark"}`}>
                  {config.privacyLabel}{" "}
                  <Link href="/privacy-policy" className="underline hover:opacity-60 transition-opacity" target="_blank">Privacy Policy</Link>{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              {/* Marketing */}
              {config.marketingLabel && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.marketingConsent} onChange={(e) => updateField("marketingConsent", e.target.checked)}
                    className="mt-1 w-4 h-4 accent-dark shrink-0" />
                  <span className="text-xs leading-relaxed font-light text-dark">{config.marketingLabel}</span>
                </label>
              )}

              {/* Submit */}
              <div className="pt-2 text-center">
                <button type="submit" disabled={submitting}
                  className="bg-dark text-white px-14 py-3.5 text-sm font-medium uppercase tracking-[0.15em] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? "Submitting..." : config.buttonLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
