"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PROJECT_TYPES } from "@/lib/constants";
import type { Project } from "@/types";

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentType = searchParams.get("type") || "TUTTI";
  const currentPage = parseInt(searchParams.get("page") || "1");

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentType !== "TUTTI") params.set("type", currentType);
    if (selectedCountry) params.set("country", selectedCountry);
    params.set("page", currentPage.toString());
    params.set("limit", "16");

    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentType, currentPage, selectedCountry]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch all countries for filter
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const allCountries = Array.from(new Set((data.data || []).map((p: Project) => p.country))).sort();
        setCountries(allCountries as string[]);
      });
  }, []);

  const setType = (type: string) => {
    const params = new URLSearchParams();
    if (type !== "TUTTI") params.set("type", type);
    router.push(`/progetti?${params}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentType !== "TUTTI") params.set("type", currentType);
    params.set("page", page.toString());
    router.push(`/progetti?${params}`);
  };

  const typeLabels: Record<string, string> = {
    BISTROT_RESTAURANT: "BISTROT & RESTAURANT",
    HOTELLERIE: "HOTELLERIE",
    RESIDENZIALE: "RESIDENZIALE",
    SPAZI_CULTURALI: "SPAZI CULTURALI",
  };

  return (
    <>
      {/* Hero */}
      <section className="relative h-[35vh] flex items-center justify-center bg-warm-900">
        <Image
          src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=600&fit=crop"
          alt="Progetti"
          fill
          className="object-cover opacity-30"
        />
        <h1 className="relative font-serif text-4xl md:text-5xl text-white">Progetti</h1>
      </section>

      {/* Description */}
      <section className="luxury-container py-12 text-center">
        <p className="text-sm text-warm-600 leading-relaxed max-w-3xl mx-auto">
          Uno sguardo sulle nostre realizzazioni nel mondo. Dai bistrot più ricercati agli hotel
          d&apos;avanguardia, dagli spazi culturali ai contesti residenziali, i nostri arredi contribuiscono a
          definire atmosfere inconfondibili. In questa sezione raccogliamo una selezione di progetti
          che raccontano come la nostra estetica e la nostra storia si intrecciano con le visioni di
          architetti e interior designer contemporanei.
        </p>
      </section>

      {/* Type tabs */}
      <section className="luxury-container pb-4">
        <div className="flex flex-wrap gap-4 justify-center">
          {PROJECT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setType(type.value)}
              className={`text-xs font-medium uppercase tracking-[0.15em] pb-2 transition-colors ${
                currentType === type.value
                  ? "text-warm-800 border-b-2 border-warm-800"
                  : "text-warm-400 hover:text-warm-600"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dropdown filters */}
      <section className="luxury-container pb-8">
        <div className="flex flex-wrap gap-4 justify-center">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="border border-warm-300 rounded px-4 py-2 text-xs text-warm-600 focus:outline-none focus:border-warm-800"
          >
            <option value="">Filtra per Paese</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Project Grid */}
      <section className="luxury-container pb-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-warm-200 rounded" />
                <div className="h-3 bg-warm-200 rounded mt-3 w-20" />
                <div className="h-4 bg-warm-200 rounded mt-2 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/progetti?type=${project.type}`}
                  className="group"
                >
                  <div className="image-hover aspect-square relative bg-warm-100 rounded-sm">
                    <Image
                      src={project.imageUrl}
                      alt={project.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400">
                      {typeLabels[project.type] || project.type}
                    </p>
                    <h3 className="text-sm font-medium text-warm-800 mt-0.5 group-hover:text-brand-500 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-full text-xs transition-colors ${
                      currentPage === i + 1
                        ? "bg-warm-800 text-white"
                        : "text-warm-500 hover:bg-warm-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {projects.length === 0 && !loading && (
              <div className="text-center py-12 text-warm-400">Nessun progetto trovato</div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default function ProgettiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
