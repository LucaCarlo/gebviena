import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import AccessoForm from "./AccessoForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Area Professionisti — Gebrüder Thonet Vienna",
  robots: { index: false, follow: false },
};

/** /area-professionisti/accesso — login + registrazione.
 *  Se l'utente è già loggato, lo mando direttamente alla pagina riservata. */
export default async function AccessoPage({ searchParams }: { searchParams: { mode?: string } }) {
  const pro = await getAuthProfessional();
  let lang = "it";
  try { lang = headers().get("x-gtv-lang") || "it"; } catch { /* */ }
  if (pro) {
    const prefix = lang === "it" ? "" : `/${lang}`;
    redirect(`${prefix}/area-professionisti`);
  }
  const initialMode = searchParams.mode === "register" ? "register" : "login";
  return (
    <main className="min-h-screen bg-white pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <AccessoForm initialMode={initialMode} />
      </div>
    </main>
  );
}
