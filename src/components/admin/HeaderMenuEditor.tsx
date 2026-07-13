"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowUp, ArrowDown, Trash2, Plus, Save, Eye, EyeOff, ExternalLink,
  ChevronRight, ChevronDown, Loader2, Check, AlertCircle,
} from "lucide-react";
import type { HeaderMenuItem, HeaderMenuLang } from "@/lib/header-menu-types";
import { HEADER_MENU_LANGS } from "@/lib/header-menu-types";

/** Genera un id stabile pseudo-random. */
function makeId() {
  return "item-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function emptyItem(): HeaderMenuItem {
  return {
    id: makeId(),
    labels: { it: "" },
    href: "/",
    external: false,
    isActive: true,
  };
}

/** Sposta un elemento su/giu nell'array. */
function moveItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const nx = idx + dir;
  if (nx < 0 || nx >= arr.length) return arr;
  const out = [...arr];
  [out[idx], out[nx]] = [out[nx], out[idx]];
  return out;
}

/** Trova + modifica un item nel tree per id. path e' [i, j, k] indices. */
function updateAtPath(items: HeaderMenuItem[], path: number[], fn: (it: HeaderMenuItem) => HeaderMenuItem): HeaderMenuItem[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  const out = [...items];
  const target = out[head];
  if (!target) return items;
  if (rest.length === 0) {
    out[head] = fn(target);
  } else {
    out[head] = { ...target, children: updateAtPath(target.children || [], rest, fn) };
  }
  return out;
}
function removeAtPath(items: HeaderMenuItem[], path: number[]): HeaderMenuItem[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  const out = [...items];
  if (rest.length === 0) {
    out.splice(head, 1);
  } else if (out[head]) {
    out[head] = { ...out[head], children: removeAtPath(out[head].children || [], rest) };
  }
  return out;
}
function moveAtPath(items: HeaderMenuItem[], path: number[], dir: -1 | 1): HeaderMenuItem[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  if (rest.length === 0) return moveItem(items, head, dir);
  const out = [...items];
  if (out[head]) out[head] = { ...out[head], children: moveAtPath(out[head].children || [], rest, dir) };
  return out;
}
function addChildAtPath(items: HeaderMenuItem[], path: number[]): HeaderMenuItem[] {
  if (path.length === 0) return [...items, emptyItem()];
  const [head, ...rest] = path;
  const out = [...items];
  if (!out[head]) return items;
  if (rest.length === 0) {
    out[head] = { ...out[head], children: [...(out[head].children || []), emptyItem()] };
  } else {
    out[head] = { ...out[head], children: addChildAtPath(out[head].children || [], rest) };
  }
  return out;
}

export default function HeaderMenuEditor() {
  const [items, setItems] = useState<HeaderMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/header-menu")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success && Array.isArray(d.data)) setItems(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/header-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || "Errore salvataggio");
      showToast("Menu salvato", "ok");
    } catch (e) {
      showToast((e as Error).message || "Errore salvataggio", "err");
    } finally {
      setSaving(false);
    }
  }, [items]);

  const restoreBackup = async () => {
    if (!confirm("Ripristinare l'ultima versione salvata prima delle modifiche?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/header-menu", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data?.error || "Errore ripristino backup", "err");
        return;
      }
      const r = await fetch("/api/admin/header-menu", { cache: "no-store" });
      const j = await r.json();
      if (j.success && Array.isArray(j.data)) setItems(j.data);
      showToast("Backup ripristinato — ricarica il sito pubblico per vederlo", "ok");
    } finally {
      setSaving(false);
    }
  };


  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-warm-500"><Loader2 size={16} className="animate-spin" /> Caricamento…</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Header sito — voci menu</h1>
          <p className="text-sm text-warm-500 mt-1">
            Configura voci, sotto-voci (fino a 2 livelli) e le loro traduzioni. Le modifiche diventano attive appena premi <strong>Salva</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setItems([...items, emptyItem()])}
            className="inline-flex items-center gap-1.5 text-sm border border-warm-300 px-3 py-2 rounded-lg hover:bg-warm-50"
          >
            <Plus size={14} /> Aggiungi voce
          </button>
          <button
            type="button"
            onClick={restoreBackup}
            disabled={saving}
            className="mr-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-warm-300 text-warm-700 rounded hover:bg-warm-50 disabled:opacity-50"
            title="Ripristina l'ultima versione salvata prima di questa"
          >
            Ripristina backup
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-warm-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-warm-900 disabled:bg-warm-400"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salva
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${
          toast.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {toast.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />} {toast.msg}
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16 border border-dashed border-warm-300 rounded-lg text-warm-500 text-sm">
            Nessuna voce configurata. Clicca <strong>Aggiungi voce</strong> per iniziare.
          </div>
        )}
        {items.map((it, i) => (
          <ItemRow
            key={it.id}
            item={it}
            path={[i]}
            depth={0}
            siblingsCount={items.length}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onChange={(next) => setItems(updateAtPath(items, [i], () => next))}
            onRemove={() => setItems(removeAtPath(items, [i]))}
            onMoveUp={() => setItems(moveAtPath(items, [i], -1))}
            onMoveDown={() => setItems(moveAtPath(items, [i], 1))}
            onAddChild={() => setItems(addChildAtPath(items, [i]))}
            onNestedChange={(path, fn) => setItems(updateAtPath(items, [i, ...path], fn))}
            onNestedRemove={(path) => setItems(removeAtPath(items, [i, ...path]))}
            onNestedMove={(path, dir) => setItems(moveAtPath(items, [i, ...path], dir))}
            onNestedAddChild={(path) => setItems(addChildAtPath(items, [i, ...path]))}
          />
        ))}
      </div>
    </div>
  );
}

interface ItemRowProps {
  item: HeaderMenuItem;
  path: number[];
  depth: number;
  siblingsCount: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onChange: (it: HeaderMenuItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddChild: () => void;
  onNestedChange: (path: number[], fn: (it: HeaderMenuItem) => HeaderMenuItem) => void;
  onNestedRemove: (path: number[]) => void;
  onNestedMove: (path: number[], dir: -1 | 1) => void;
  onNestedAddChild: (path: number[]) => void;
}

function ItemRow(p: ItemRowProps) {
  const { item, depth, siblingsCount, expanded, onToggleExpand, onChange, onRemove, onMoveUp, onMoveDown, onAddChild } = p;
  const idx = p.path[p.path.length - 1];
  const isOpen = expanded.has(item.id);

  const setLabel = (lang: HeaderMenuLang, v: string) => onChange({ ...item, labels: { ...item.labels, [lang]: v } });

  const bgClass = depth === 0 ? "bg-white border-warm-300" : depth === 1 ? "bg-warm-50 border-warm-200 ml-8" : "bg-warm-100 border-warm-200 ml-16";

  return (
    <>
      <div className={`border rounded-lg ${bgClass}`}>
        <div className="flex items-center gap-2 p-3 flex-wrap">
          {/* Toggle expand (solo se ha children o e' un container potenziale) */}
          {depth < 2 && (
            <button
              type="button"
              onClick={() => onToggleExpand(item.id)}
              className="p-1 text-warm-500 hover:text-warm-800"
              title={isOpen ? "Comprimi" : "Espandi"}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}

          {/* Label IT (input inline) — visibile sempre come "master" */}
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute -top-1.5 left-2 px-1 bg-white text-[10px] uppercase tracking-wider text-warm-500 font-semibold rounded">IT</span>
            <input
              type="text"
              value={item.labels.it || ""}
              onChange={(e) => setLabel("it", e.target.value)}
              placeholder="Etichetta italiana"
              className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>

          {/* Href */}
          <input
            type="text"
            value={item.href}
            onChange={(e) => onChange({ ...item, href: e.target.value })}
            placeholder="URL (/prodotti o https://…)"
            className="flex-1 min-w-[220px] border border-warm-300 rounded px-2 py-1.5 text-sm bg-white font-mono text-xs"
          />

          {/* External toggle */}
          <label className="inline-flex items-center gap-1 text-xs text-warm-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!item.external}
              onChange={(e) => onChange({ ...item, external: e.target.checked })}
              className="w-3.5 h-3.5 accent-warm-800"
            />
            <ExternalLink size={12} /> Esterno
          </label>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...item, isActive: !item.isActive })}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
              item.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-warm-100 text-warm-500 border border-warm-300"
            }`}
            title={item.isActive ? "Attivo" : "Nascosto"}
          >
            {item.isActive ? <><Eye size={12} /> Attivo</> : <><EyeOff size={12} /> Nascosto</>}
          </button>

          {/* Up/Down */}
          <div className="inline-flex">
            <button type="button" onClick={onMoveUp} disabled={idx === 0} className="p-1.5 text-warm-500 hover:text-warm-800 disabled:opacity-30" title="Sposta su">
              <ArrowUp size={14} />
            </button>
            <button type="button" onClick={onMoveDown} disabled={idx === siblingsCount - 1} className="p-1.5 text-warm-500 hover:text-warm-800 disabled:opacity-30" title="Sposta giù">
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Aggiungi child (se depth < 2) */}
          {depth < 2 && (
            <button type="button" onClick={onAddChild} className="inline-flex items-center gap-1 text-xs text-warm-600 hover:text-warm-800 border border-warm-300 rounded px-2 py-1" title="Aggiungi sotto-voce">
              <Plus size={12} /> Sub
            </button>
          )}

          {/* Delete */}
          <button type="button" onClick={onRemove} className="p-1.5 text-red-500 hover:text-red-700" title="Elimina">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Sezione traduzioni (visibile quando esteso) */}
        {isOpen && (
          <div className="border-t border-warm-200 p-3 bg-warm-50/50">
            <div className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Traduzioni</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {HEADER_MENU_LANGS.filter((l) => l !== "it").map((lang) => {
                const langName: Record<string, string> = { en: "English", de: "Deutsch", fr: "Français", es: "Español" };
                return (
                  <label key={lang} className="text-xs">
                    <span className="block text-warm-500 uppercase tracking-wider mb-0.5">{lang} — {langName[lang] || lang}</span>
                    <input
                      type="text"
                      value={item.labels[lang] || ""}
                      onChange={(e) => setLabel(lang, e.target.value)}
                      placeholder={`Traduci in ${langName[lang] || lang}…`}
                      className="w-full border border-warm-300 rounded px-2 py-1 text-sm bg-white"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sotto-voci nested */}
      {isOpen && item.children && item.children.length > 0 && (
        <div className="space-y-2 mt-2">
          {item.children.map((c, ci) => (
            <ItemRow
              key={c.id}
              item={c}
              path={[...p.path, ci]}
              depth={depth + 1}
              siblingsCount={item.children!.length}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onChange={(next) => p.onNestedChange([ci], () => next)}
              onRemove={() => p.onNestedRemove([ci])}
              onMoveUp={() => p.onNestedMove([ci], -1)}
              onMoveDown={() => p.onNestedMove([ci], 1)}
              onAddChild={() => p.onNestedAddChild([ci])}
              onNestedChange={(cp, fn) => p.onNestedChange([ci, ...cp], fn)}
              onNestedRemove={(cp) => p.onNestedRemove([ci, ...cp])}
              onNestedMove={(cp, dir) => p.onNestedMove([ci, ...cp], dir)}
              onNestedAddChild={(cp) => p.onNestedAddChild([ci, ...cp])}
            />
          ))}
        </div>
      )}
    </>
  );
}
