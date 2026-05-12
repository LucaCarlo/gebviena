"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Upload, FileText, Eye, EyeOff, Loader2 } from "lucide-react";

interface FabricFile {
  id: string;
  name: string;
  title: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  sortOrder: number;
  isPublished: boolean;
}

interface FabricCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  files: FabricFile[];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminFabricFinishesPage() {
  const [categories, setCategories] = useState<FabricCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingCat, setEditingCat] = useState<FabricCategory | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);
  const [catForm, setCatForm] = useState<{ name: string; slug: string; description: string; sortOrder: number; isPublished: boolean }>({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    isPublished: true,
  });
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/fabric-finishes");
    const data = await res.json();
    if (data.success) setCategories(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openNewCat = () => {
    setCatForm({ name: "", slug: "", description: "", sortOrder: categories.length, isPublished: true });
    setCreatingCat(true);
    setEditingCat(null);
  };

  const openEditCat = (c: FabricCategory) => {
    setCatForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      sortOrder: c.sortOrder,
      isPublished: c.isPublished,
    });
    setEditingCat(c);
    setCreatingCat(false);
  };

  const closeForm = () => {
    setEditingCat(null);
    setCreatingCat(false);
  };

  const saveCat = async () => {
    const payload = {
      name: catForm.name.trim(),
      slug: catForm.slug.trim() || slugify(catForm.name),
      description: catForm.description.trim() || null,
      sortOrder: catForm.sortOrder,
      isPublished: catForm.isPublished,
    };
    if (!payload.name) return alert("Nome obbligatorio");
    if (!payload.slug) return alert("Slug obbligatorio");
    const url = editingCat ? `/api/admin/fabric-finishes/${editingCat.id}` : "/api/admin/fabric-finishes";
    const method = editingCat ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) return alert(`Errore: ${data.error || "operazione fallita"}`);
    closeForm();
    fetchCategories();
  };

  const deleteCat = async (c: FabricCategory) => {
    if (!confirm(`Eliminare la categoria "${c.name}" e tutti i suoi file?`)) return;
    const res = await fetch(`/api/admin/fabric-finishes/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) return alert(`Errore: ${data.error || "operazione fallita"}`);
    fetchCategories();
  };

  const togglePublishCat = async (c: FabricCategory) => {
    await fetch(`/api/admin/fabric-finishes/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !c.isPublished }),
    });
    fetchCategories();
  };

  const uploadFile = async (categoryId: string, file: File) => {
    setUploadingTo(categoryId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "fabric-finishes");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) {
        alert(`Upload fallito: ${data.error || "errore sconosciuto"}`);
        return;
      }
      const uploaded = data.data as { url: string; name: string; size: number };
      // Determina mime type rough da estensione
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const mimeMap: Record<string, string> = { pdf: "application/pdf", zip: "application/zip", rar: "application/vnd.rar", dwg: "image/vnd.dwg", dxf: "application/dxf" };
      const mimeType = file.type || mimeMap[ext] || "application/octet-stream";

      // Chiedi all'utente il titolo visibile sul sito (separato dal filename)
      const fallbackTitle = uploaded.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const title = window.prompt("Titolo del file (visibile sul sito pubblico):", fallbackTitle);
      if (title === null) {
        // Utente ha annullato → non salviamo il record, ma il file è già caricato.
        // L'admin pu reimpostare il titolo riprovando l'upload o usando un record vuoto.
        // Per semplicit, scartiamo l'upload (nessun record DB).
        return;
      }

      const fileRes = await fetch(`/api/admin/fabric-finishes/${categoryId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploaded.name,
          title: title.trim() || fallbackTitle,
          fileUrl: uploaded.url,
          fileSize: uploaded.size,
          mimeType,
          sortOrder: 0,
          isPublished: true,
        }),
      });
      const fileData = await fileRes.json();
      if (!fileData.success) alert(`Errore salvataggio file: ${fileData.error || "errore"}`);
      fetchCategories();
    } finally {
      setUploadingTo(null);
    }
  };

  const deleteFile = async (categoryId: string, fileId: string, label: string) => {
    if (!confirm(`Eliminare "${label}"?`)) return;
    await fetch(`/api/admin/fabric-finishes/${categoryId}/files/${fileId}`, { method: "DELETE" });
    fetchCategories();
  };

  const editFileTitle = async (categoryId: string, file: FabricFile) => {
    const current = file.title || "";
    const newTitle = window.prompt("Titolo visibile sul sito:", current);
    if (newTitle === null) return;
    await fetch(`/api/admin/fabric-finishes/${categoryId}/files/${file.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    fetchCategories();
  };

  const editFileName = async (categoryId: string, file: FabricFile) => {
    const newName = window.prompt("Nome file interno (filename — non visibile sul sito):", file.name);
    if (!newName || newName.trim() === file.name) return;
    await fetch(`/api/admin/fabric-finishes/${categoryId}/files/${file.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    fetchCategories();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Tessuti e Finiture</h1>
          <p className="text-sm text-warm-500 mt-1">Categorie con schede PDF visibili sulla pagina pubblica Materiale Tecnico.</p>
        </div>
        <button
          onClick={openNewCat}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuova categoria
        </button>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center text-warm-400 text-sm">Nessuna categoria. Creane una per iniziare.</div>
          ) : (
            categories.map((c) => {
              const isOpen = expanded.has(c.id);
              return (
                <div key={c.id} className="border-b border-warm-100 last:border-b-0">
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-warm-50">
                    <button onClick={() => toggleExpand(c.id)} className="flex items-center gap-3 flex-1 text-left">
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <div>
                        <div className="font-medium text-warm-800">{c.name}</div>
                        <div className="text-xs text-warm-500">
                          slug: <code>{c.slug}</code> • {c.files.length} file • sort {c.sortOrder}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePublishCat(c)}
                        className={`p-2 rounded transition-colors ${c.isPublished ? "text-emerald-600 hover:bg-emerald-50" : "text-warm-400 hover:bg-warm-100"}`}
                        title={c.isPublished ? "Pubblicato — clicca per nascondere" : "Nascosto — clicca per pubblicare"}
                      >
                        {c.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => openEditCat(c)} className="p-2 text-warm-600 hover:bg-warm-100 rounded" title="Modifica">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deleteCat(c)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Elimina">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="bg-warm-50/50 px-12 py-4 border-t border-warm-100">
                      {c.description && <p className="text-sm text-warm-600 mb-3">{c.description}</p>}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-warm-600">File ({c.files.length})</span>
                        <label className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-blue-700 transition-colors">
                          {uploadingTo === c.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {uploadingTo === c.id ? "Upload in corso..." : "Carica file"}
                          <input
                            type="file"
                            accept=".pdf,.zip,.rar,.dwg,.dxf,application/pdf,application/zip,application/vnd.rar,application/x-rar-compressed,image/vnd.dwg,application/dxf"
                            className="hidden"
                            disabled={uploadingTo === c.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadFile(c.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {c.files.length === 0 ? (
                        <div className="py-6 text-center text-warm-400 text-sm">Nessun file caricato.</div>
                      ) : (
                        <div className="bg-white rounded border border-warm-200 divide-y divide-warm-100">
                          {c.files.map((f) => (
                            <div key={f.id} className="flex items-center justify-between px-3 py-2 hover:bg-warm-50">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileText size={16} className="text-warm-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-warm-800 truncate">
                                      {f.title || <em className="text-amber-700">(senza titolo)</em>}
                                    </span>
                                    <button
                                      onClick={() => editFileTitle(c.id, f)}
                                      className="text-[11px] text-blue-600 hover:underline flex-shrink-0"
                                      title="Modifica titolo visibile sul sito"
                                    >
                                      modifica titolo
                                    </button>
                                  </div>
                                  <div className="text-xs text-warm-500 truncate">
                                    <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                      {f.name}
                                    </a>
                                    {" "}• {formatBytes(f.fileSize)} • {f.mimeType || "—"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => editFileName(c.id, f)} className="p-1.5 text-warm-600 hover:bg-warm-100 rounded" title="Rinomina filename interno">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => deleteFile(c.id, f.id, f.title || f.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Elimina">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {(creatingCat || editingCat) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold text-warm-800 mb-4">{editingCat ? "Modifica categoria" : "Nuova categoria"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1">Nome *</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCatForm((prev) => ({
                      ...prev,
                      name: v,
                      slug: !editingCat && (prev.slug === "" || prev.slug === slugify(prev.name)) ? slugify(v) : prev.slug,
                    }));
                  }}
                  className="w-full border border-warm-300 rounded px-3 py-2 text-sm"
                  placeholder="Es. Pelle"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1">Slug URL *</label>
                <input
                  type="text"
                  value={catForm.slug}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full border border-warm-300 rounded px-3 py-2 text-sm font-mono"
                  placeholder="es-pelle"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1">Descrizione</label>
                <textarea
                  value={catForm.description}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-warm-300 rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Opzionale, mostrata sopra l'elenco file"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-warm-600 mb-1">Sort order</label>
                  <input
                    type="number"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full border border-warm-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catForm.isPublished}
                    onChange={(e) => setCatForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  <span className="text-sm text-warm-700">Pubblicata</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={closeForm} className="px-4 py-2 text-sm text-warm-600 hover:bg-warm-100 rounded">
                Annulla
              </button>
              <button onClick={saveCat} className="px-4 py-2 bg-warm-800 text-white text-sm font-medium rounded hover:bg-warm-900">
                {editingCat ? "Salva" : "Crea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
