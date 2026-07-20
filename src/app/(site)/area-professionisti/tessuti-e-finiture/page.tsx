import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { prisma } from "@/lib/prisma";
import TessutiFinitureClient from "./TessutiFinitureClient";

export const dynamic = "force-dynamic";
const SLUG = "tessuti-e-finiture";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");

  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  const rows = await prisma.fabricFinishCategory.findMany({
    where: { isPublished: true },
    include: {
      files: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, title: true, fileUrl: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const categories = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    files: c.files,
  }));

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Link
          href="/area-professionisti"
          className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6"
        >
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">
          {section.label}
        </h1>
        <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-3xl">
          {section.description}
        </p>

        <TessutiFinitureClient categories={categories} />
      </div>
    </main>
  );
}
