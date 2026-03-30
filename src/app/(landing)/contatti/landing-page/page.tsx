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

  // Inactive state
  if (!config.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-warm-500 text-sm">
          This page is currently not available.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <header
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: "#3a5a6a" }}
      >
        {/* Background pattern text */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-10 select-none pointer-events-none">
          <div className="whitespace-nowrap text-[120px] font-serif font-light text-white tracking-wider leading-none">
            TRUE OVER TIME TRUE OVER TIME TRUE OVER TIME
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.07] select-none pointer-events-none translate-y-12">
          <div className="whitespace-nowrap text-[120px] font-serif font-light text-white tracking-wider leading-none">
            TRUE OVER TIME TRUE OVER TIME TRUE OVER TIME
          </div>
        </div>

        {config.bannerImage && (
          <Image
            src={config.bannerImage}
            alt="Banner"
            fill
            className="object-cover"
            priority
          />
        )}

        <div className="relative z-10 flex items-center justify-center py-6 md:py-8 px-8">
          <div className="flex items-center gap-6">
            {config.logoImage ? (
              <Image
                src={config.logoImage}
                alt="Logo"
                width={200}
                height={60}
                className="h-12 md:h-16 w-auto"
              />
            ) : (
              <Image
                src="/logo-white.svg"
                alt="Gebrüder Thonet Vienna"
                width={200}
                height={60}
                className="h-12 md:h-16 w-auto"
              />
            )}
          </div>
        </div>
      </header>

      {/* Hero text */}
      <section className="text-center px-6 py-10 md:py-14">
        <h1 className="font-serif text-2xl md:text-3xl text-warm-900 font-semibold mb-3">
          {config.heroTitle}
        </h1>
        {config.heroSubtitle && (
          <p className="text-sm md:text-base text-warm-600 italic mb-6">
            {config.heroSubtitle}
          </p>
        )}
        {config.heroLocation && (
          <div className="mb-4">
            {config.heroLocation.split("\n").map((line, i) => (
              <p
                key={i}
                className="text-sm font-semibold text-warm-800"
              >
                {line}
              </p>
            ))}
          </div>
        )}
        {config.heroLocation && (
          <div className="text-warm-300 mb-4">———</div>
        )}
        {config.heroDescription && (
          <div className="text-warm-600">
            {config.heroDescription.split("\n").map((line, i) => (
              <p key={i} className="text-sm italic">
                {line}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Form or Success */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="max-w-lg mx-auto">
          {success ? (
            <div className="text-center py-12 animate-in fade-in duration-500">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
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
              <h2 className="font-serif text-2xl text-warm-900 mb-4">
                {config.successTitle}
              </h2>
              {config.successMessage && (
                <p className="text-sm text-warm-600 mb-6">
                  {config.successMessage}
                </p>
              )}
              {/* QR Code placeholder */}
              <div className="inline-block border-2 border-warm-200 rounded-lg p-4 mb-4">
                <div className="w-48 h-48 bg-warm-50 flex items-center justify-center rounded">
                  <div className="text-center">
                    <svg
                      className="w-24 h-24 text-warm-400 mx-auto mb-2"
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
              <p className="text-xs text-warm-400 mt-4">
                Your personal QR code ID:{" "}
                <span className="font-mono">{qrCode}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {serverError}
                </div>
              )}

              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.firstName
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.lastName
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.email
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Profile */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  Profile <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.profile}
                  onChange={(e) => updateField("profile", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.profile
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors appearance-none cursor-pointer`}
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
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  Country or Region <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.country
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.country && (
                  <p className="text-red-500 text-xs mt-1">{errors.country}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  State or Province
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full border-b-2 border-warm-300 focus:border-warm-800 bg-transparent py-2.5 text-sm outline-none transition-colors"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.city
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>

              {/* ZIP */}
              <div>
                <label className="block text-sm font-semibold text-warm-800 mb-2">
                  ZIP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  className={`w-full border-b-2 ${
                    errors.zipCode
                      ? "border-red-400"
                      : "border-warm-300 focus:border-warm-800"
                  } bg-transparent py-2.5 text-sm outline-none transition-colors`}
                />
                {errors.zipCode && (
                  <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-warm-200 pt-6" />

              {/* Privacy checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={(e) =>
                    updateField("privacyAccepted", e.target.checked)
                  }
                  className="mt-1 w-4 h-4 accent-warm-800 shrink-0"
                />
                <span
                  className={`text-xs leading-relaxed ${
                    errors.privacyAccepted ? "text-red-600" : "text-warm-600"
                  }`}
                >
                  {config.privacyLabel}{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline hover:text-warm-800"
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
                    className="mt-1 w-4 h-4 accent-warm-800 shrink-0"
                  />
                  <span className="text-xs leading-relaxed text-warm-600">
                    {config.marketingLabel}
                  </span>
                </label>
              )}

              {/* Submit */}
              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2a3a4a] text-white px-12 py-3 rounded text-sm font-medium uppercase tracking-wider hover:bg-[#1a2a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
