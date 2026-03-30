"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface LandingConfig {
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
}

const PROFILE_OPTIONS = [
  "Architect / Interior Designer",
  "Press",
  "Trade / Retailer",
  "Client / Collector",
  "Student",
  "Other",
];

const DEFAULT_CONFIG: LandingConfig = {
  heroTitle: "Milan Design Week 2026",
  heroSubtitle: "Come and experience the True Over Time Collection with us.",
  heroLocation:
    "Milan Flagship Store\nPalazzo Gallarati Scotti\nVia Manzoni 30",
  heroDescription:
    "Register to receive your QR code to show at entrance.\nThe QR code is personal and can't be shared.",
  successTitle: "Thank you. Your QR code has been generated.",
  successMessage: null,
  privacyLabel:
    "I have read and understood the Privacy Policy on processing of my personal data and I confirm that I am over 18.",
  marketingLabel:
    "I agree to receive communications and updates about GTV products and events.",
  buttonLabel: "Register",
  bannerImage: null,
  logoImage: null,
  isActive: true,
};

export default function LandingPage() {
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
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    fetch("/api/landing-page-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setConfig(data.data);
        }
      })
      .catch(() => {});
  }, []);

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
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setQrCode(data.data.qrCode);
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
    <>
      {/* Banner — not full width, centered with max-width */}
      {config.bannerImage && (
        <section className="pt-6 md:pt-10">
          <div className="mx-auto" style={{ maxWidth: "860px" }}>
            <div className="relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: "860 / 140" }}>
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

      {/* Hero text — mondo-gtv style */}
      <section className="text-center px-6 py-14 md:py-20">
        <h1 className="font-serif text-[32px] md:text-[42px] text-dark tracking-tight font-light mb-4">
          {config.heroTitle}
        </h1>
        {config.heroSubtitle && (
          <p className="text-lg text-dark leading-[1.8] font-light mb-8">
            {config.heroSubtitle}
          </p>
        )}
        {config.heroLocation && (
          <div className="mb-6">
            {config.heroLocation.split("\n").map((line, i) => (
              <p
                key={i}
                className="text-base font-semibold text-dark leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
        )}
        {config.heroLocation && config.heroDescription && (
          <div className="text-warm-300 mb-6 text-xl">———</div>
        )}
        {config.heroDescription && (
          <div>
            {config.heroDescription.split("\n").map((line, i) => (
              <p key={i} className="text-base text-dark font-light italic leading-[1.8]">
                {line}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Form or Success */}
      <section className="px-6 pb-20 md:pb-32">
        <div className="mx-auto" style={{ maxWidth: "580px" }}>
          {success ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-50 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="font-serif text-[28px] md:text-[36px] text-dark tracking-tight font-light mb-4">
                {config.successTitle}
              </h2>
              {config.successMessage && (
                <p className="text-base text-dark font-light leading-[1.8] mb-8">
                  {config.successMessage}
                </p>
              )}
              <div className="inline-block border border-warm-200 rounded p-6 mb-4">
                <div className="w-48 h-48 bg-warm-50 flex items-center justify-center rounded">
                  <div className="text-center">
                    <svg
                      className="w-24 h-24 text-warm-300 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                    <p className="text-[10px] font-mono text-warm-400">
                      {qrCode.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-warm-400 mt-4 font-light">
                Your personal QR code ID:{" "}
                <span className="font-mono">{qrCode}</span>
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
                <label className="block text-sm font-semibold text-dark mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={`w-full border-b ${
                    errors.firstName
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={`w-full border-b ${
                    errors.lastName
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full border-b ${
                    errors.email
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.email}</p>
                )}
              </div>

              {/* Profile */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Profile <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.profile}
                  onChange={(e) => updateField("profile", e.target.value)}
                  className={`w-full border-b ${
                    errors.profile
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors appearance-none cursor-pointer`}
                >
                  <option value="">Select...</option>
                  {PROFILE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Country or Region <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={`w-full border-b ${
                    errors.country
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.country && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.country}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  State or Province
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full border-b border-warm-300 focus:border-dark bg-transparent py-3 text-base font-light text-dark outline-none transition-colors"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={`w-full border-b ${
                    errors.city
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.city}</p>
                )}
              </div>

              {/* ZIP */}
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  ZIP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  className={`w-full border-b ${
                    errors.zipCode
                      ? "border-red-400"
                      : "border-warm-300 focus:border-dark"
                  } bg-transparent py-3 text-base font-light text-dark outline-none transition-colors`}
                />
                {errors.zipCode && (
                  <p className="text-red-500 text-xs mt-1 font-light">{errors.zipCode}</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-warm-200" />

              {/* Privacy checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={(e) =>
                    updateField("privacyAccepted", e.target.checked)
                  }
                  className="mt-1 w-4 h-4 accent-dark shrink-0"
                />
                <span
                  className={`text-xs leading-relaxed font-light ${
                    errors.privacyAccepted ? "text-red-600" : "text-dark"
                  }`}
                >
                  {config.privacyLabel}{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline hover:opacity-60 transition-opacity"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              {/* Marketing checkbox */}
              {config.marketingLabel && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.marketingConsent}
                    onChange={(e) =>
                      updateField("marketingConsent", e.target.checked)
                    }
                    className="mt-1 w-4 h-4 accent-dark shrink-0"
                  />
                  <span className="text-xs leading-relaxed font-light text-dark">
                    {config.marketingLabel}
                  </span>
                </label>
              )}

              {/* Submit */}
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-dark text-white px-14 py-3.5 text-sm font-medium uppercase tracking-[0.15em] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : config.buttonLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
