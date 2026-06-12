import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { getProT } from "@/lib/pro-translations";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);

  // Label dinamica per il campo "azienda" in base al ruolo
  const companyLabel =
    pro.role === "PRESS" ? t("account.company_press")
    : pro.role === "ARCHITECT_DESIGNER" ? t("account.company_studio")
    : t("account.company_default");

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <Link
          href="/area-professionisti"
          className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6"
        >
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">
          {t("account.title")}
        </h1>
        <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-2xl">
          {t("account.intro")}{" "}
          <a href="mailto:info@gebruederthonetvienna.com" className="underline hover:text-warm-900">
            info@gebruederthonetvienna.com
          </a>.
        </p>

        <AccountClient
          initialData={{
            email: pro.email,
            firstName: pro.firstName,
            lastName: pro.lastName,
            phone: pro.phone || "",
            company: pro.company,
            role: t(`role.${pro.role}`),
            language: pro.language,
          }}
          i18n={{
            summary: t("account.summary"),
            emailLogin: t("account.email_login"),
            role: t("account.role"),
            personal: t("account.personal"),
            firstName: t("account.first_name"),
            lastName: t("account.last_name"),
            phone: t("account.phone"),
            companyLabel,
            language: t("account.language"),
            saveData: t("account.save_data"),
            saving: t("common.saving"),
            saved: t("account.saved"),
            required: t("account.required"),
            networkError: t("account.network_error"),
            passwordTitle: t("account.password_title"),
            passwordCurrent: t("account.password_current"),
            passwordNew: t("account.password_new"),
            passwordConfirm: t("account.password_confirm"),
            passwordHint: t("account.password_hint"),
            passwordBtn: t("account.password_btn"),
            passwordChanging: t("account.password_changing"),
            passwordChanged: t("account.password_changed"),
            passwordMismatch: t("account.password_mismatch"),
            passwordWeak: t("account.password_weak"),
            fieldRequired: t("account.field_required"),
            logout: t("dashboard.cta.logout"),
          }}
        />
      </div>
    </main>
  );
}
