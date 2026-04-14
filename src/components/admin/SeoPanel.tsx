"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, X as XIcon, Plus, Trash2 } from "lucide-react";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { TInput, TTextarea } from "./TranslatableField";

interface SeoPanelProps {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[]; // array of keywords
  slug?: string;
  content?: string; // the main body content (description/bio HTML)
  onChange: (field: "seoTitle" | "seoDescription" | "seoKeywords", value: string | string[]) => void;
}

interface SeoCheck {
  label: string;
  passed: boolean;
  category: "base" | "advanced" | "title" | "readability";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  const clean = stripHtml(text).trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

export default function SeoPanel({ seoTitle: rawSeoTitle, seoDescription: rawSeoDescription, seoKeywords, slug, content, onChange }: SeoPanelProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const tCtx = useTranslationCtx();
  // When translating, show translated values for analytics; the inputs themselves are TInput/TTextarea (already lang-aware)
  const seoTitle = tCtx?.isTranslating ? tCtx.getValue("seoTitle", rawSeoTitle) : rawSeoTitle;
  const seoDescription = tCtx?.isTranslating ? tCtx.getValue("seoDescription", rawSeoDescription) : rawSeoDescription;

  const addKeyword = useCallback(() => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !seoKeywords.includes(kw)) {
      onChange("seoKeywords", [...seoKeywords, kw]);
    }
    setNewKeyword("");
  }, [newKeyword, seoKeywords, onChange]);

  const removeKeyword = (kw: string) => {
    onChange("seoKeywords", seoKeywords.filter((k) => k !== kw));
  };

  const primaryKeyword = seoKeywords[0] || "";
  const plainContent = content ? stripHtml(content) : "";
  const wordCount = countWords(content || "");

  const checks = useMemo<SeoCheck[]>(() => {
    if (!primaryKeyword) return [];

    const kwLower = primaryKeyword.toLowerCase();
    const titleLower = seoTitle.toLowerCase();
    const descLower = seoDescription.toLowerCase();
    const slugLower = (slug || "").toLowerCase();
    const contentLower = plainContent.toLowerCase();

    // Count keyword occurrences
    const kwCount = contentLower.split(kwLower).length - 1;
    const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;

    // Check for keyword in headings (h2-h4)
    const headingRegex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/gi;
    let hasKwInHeading = false;
    let match;
    while ((match = headingRegex.exec(content || "")) !== null) {
      if (match[1].toLowerCase().includes(kwLower)) {
        hasKwInHeading = true;
        break;
      }
    }

    // Check for images
    const hasImages = (content || "").includes("<img");

    // Paragraphs check
    const paragraphs = plainContent.split(/\n\n|\.\s/).filter((p) => p.trim().length > 0);
    const longParagraphs = paragraphs.filter((p) => countWords(p) > 150);
    const shortParagraphs = longParagraphs.length === 0;

    // First 10% of content
    const first10 = contentLower.slice(0, Math.max(contentLower.length * 0.1, 100));

    return [
      // Base checks
      { label: "Keyword nel titolo SEO", passed: titleLower.includes(kwLower), category: "base" },
      { label: "Keyword nella meta description", passed: descLower.includes(kwLower), category: "base" },
      { label: "Keyword nello slug/URL", passed: slugLower.includes(kwLower.replace(/\s+/g, "-")), category: "base" },
      { label: "Keyword nell'inizio del contenuto", passed: first10.includes(kwLower), category: "base" },
      { label: "Keyword presente nel contenuto", passed: contentLower.includes(kwLower), category: "base" },
      { label: "Contenuto di almeno 300 parole", passed: wordCount >= 300, category: "base" },

      // Advanced checks
      { label: "Keyword in un H2-H4", passed: hasKwInHeading, category: "advanced" },
      { label: `Densità keyword 0.5-2.5% (attuale: ${density.toFixed(1)}%)`, passed: density >= 0.5 && density <= 2.5, category: "advanced" },
      { label: "URL inferiore a 75 caratteri", passed: (slug || "").length < 75, category: "advanced" },

      // Title checks
      { label: `Titolo SEO 30-60 caratteri (${seoTitle.length})`, passed: seoTitle.length >= 30 && seoTitle.length <= 60, category: "title" },
      { label: `Meta description 70-160 caratteri (${seoDescription.length})`, passed: seoDescription.length >= 70 && seoDescription.length <= 160, category: "title" },

      // Readability checks
      { label: "Paragrafi brevi (max 150 parole)", passed: shortParagraphs, category: "readability" },
      { label: "Immagini presenti nel contenuto", passed: hasImages, category: "readability" },
    ];
  }, [primaryKeyword, seoTitle, seoDescription, slug, plainContent, wordCount, content]);

  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="border border-warm-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-warm-50 border-b border-warm-200">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : totalCount === 0 ? "bg-warm-300" : "bg-red-500"}`}>
          {totalCount === 0 ? "–" : score}
        </div>
        <div>
          <span className="text-sm font-semibold text-warm-800">SEO</span>
          {primaryKeyword && (
            <p className="text-[10px] text-warm-500">
              {passedCount}/{totalCount} superati
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5">
          {/* Keywords */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
              Parole chiave
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {seoKeywords.map((kw, i) => (
                <span
                  key={kw}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs ${
                    i === 0 ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-700"
                  }`}
                >
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-red-300">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="Aggiungi keyword..."
                className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-1.5 bg-warm-800 text-white rounded text-sm hover:bg-warm-900"
              >
                <Plus size={14} />
              </button>
            </div>
            {seoKeywords.length > 0 && (
              <p className="text-[10px] text-warm-400 mt-1">La prima keyword è quella principale per l&apos;analisi.</p>
            )}
          </div>

          {/* SEO Title */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">
              Titolo SEO
            </label>
            <TInput
              fieldKey="seoTitle"
              defaultValue={rawSeoTitle}
              onDefaultChange={(v) => onChange("seoTitle", v)}
              placeholder="Titolo per i motori di ricerca"
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
            />
            <div className="flex justify-between mt-1">
              <p className={`text-[10px] ${seoTitle.length >= 30 && seoTitle.length <= 60 ? "text-green-600" : "text-warm-400"}`}>
                {seoTitle.length}/60 caratteri
              </p>
              <div className="h-1 w-20 bg-warm-100 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${seoTitle.length >= 30 && seoTitle.length <= 60 ? "bg-green-500" : seoTitle.length > 60 ? "bg-red-500" : "bg-amber-400"}`}
                  style={{ width: `${Math.min((seoTitle.length / 60) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">
              Meta Description
            </label>
            <TTextarea
              fieldKey="seoDescription"
              defaultValue={rawSeoDescription}
              onDefaultChange={(v) => onChange("seoDescription", v)}
              placeholder="Descrizione per i motori di ricerca"
              rows={3}
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className={`text-[10px] ${seoDescription.length >= 70 && seoDescription.length <= 160 ? "text-green-600" : "text-warm-400"}`}>
                {seoDescription.length}/160 caratteri
              </p>
              <div className="h-1 w-20 bg-warm-100 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${seoDescription.length >= 70 && seoDescription.length <= 160 ? "bg-green-500" : seoDescription.length > 160 ? "bg-red-500" : "bg-amber-400"}`}
                  style={{ width: `${Math.min((seoDescription.length / 160) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Score bar */}
          {primaryKeyword && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Punteggio SEO</span>
                <span className={`text-lg font-bold ${scoreColor}`}>{score}%</span>
              </div>
              <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          )}

          {/* Checklist */}
          {primaryKeyword && checks.length > 0 && (
            <div className="space-y-3">
              {(["base", "advanced", "title", "readability"] as const).map((cat) => {
                const catChecks = checks.filter((c) => c.category === cat);
                if (catChecks.length === 0) return null;
                const catLabels = {
                  base: "Controlli base",
                  advanced: "Controlli avanzati",
                  title: "Titolo e descrizione",
                  readability: "Leggibilità",
                };
                return (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1.5">{catLabels[cat]}</p>
                    <div className="space-y-1">
                      {catChecks.map((check, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {check.passed ? (
                            <Check size={14} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <XIcon size={14} className="text-red-400 flex-shrink-0" />
                          )}
                          <span className={check.passed ? "text-warm-600" : "text-warm-800 font-medium"}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!primaryKeyword && (
            <p className="text-xs text-warm-400 italic">
              Aggiungi almeno una keyword per visualizzare l&apos;analisi SEO.
            </p>
          )}
      </div>
    </div>
  );
}
