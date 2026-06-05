"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, ShoppingCart, Trash2, Mail } from "lucide-react";
import BulkEmailModal from "@/components/admin/BulkEmailModal";
import ImportExportButtons from "@/components/admin/ImportExportButtons";
import TablePagination from "@/components/admin/TablePagination";
import SortableTh, { type SortDir } from "@/components/admin/SortableTh";

interface CustomerListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isGuest: boolean;
  isActive: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  ordersCount: number;
  addressesCount: number;
  lifetimeCents: number;
  currency: string;
}

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function StoreCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [hasOrders, setHasOrders] = useState<"" | "true" | "false">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const selectAll = customers.length > 0 && selected.size === customers.length;
  const toggleSelectAll = () => {
    if (selectAll) setSelected(new Set());
    else setSelected(new Set(customers.map((c) => c.email)));
  };
  const toggleSelect = (email: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(email)) n.delete(email); else n.add(email);
      return n;
    });
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (hasOrders) params.set("hasOrders", hasOrders);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    const res = await fetch(`/api/store/customers?${params}`).then((r) => r.json());
    if (res.success) {
      setCustomers(res.data);
      setTotalCount(res.totalCount ?? res.data.length);
    }
    setLoading(false);
  }, [q, hasOrders, page, pageSize, sortBy, sortDir]);

  // Reset pagina quando filtri cambiano
  useEffect(() => { setPage(1); }, [q, hasOrders, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // URL per esportare con i filtri correnti applicati
  const exportUrl = (() => {
    const params = new URLSearchParams({ format: "csv" });
    if (q) params.set("q", q);
    if (hasOrders) params.set("hasOrders", hasOrders);
    return `/api/store/customers?${params}`;
  })();

  const handleDelete = async (e: React.MouseEvent, c: CustomerListItem) => {
    e.stopPropagation();
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
    const msg = c.ordersCount > 0
      ? `Eliminare il cliente "${fullName}" (${c.email})?\n\nHa ${c.ordersCount} ordini: la cronologia ordini resterà ma sarà "orfana" (senza cliente collegato). L'operazione è irreversibile.`
      : `Eliminare il cliente "${fullName}" (${c.email})?\n\nL'operazione è irreversibile.`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/store/customers/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCustomers((arr) => arr.filter((x) => x.id !== c.id));
      } else {
        alert(data.error || "Errore eliminazione");
      }
    } catch {
      alert("Errore di rete");
    }
  };

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900">Clienti</h1>
          <p className="text-sm text-warm-500 mt-1">
            Account registrati al checkout dello store, con storico ordini e indirizzi salvati.
          </p>
          <p className="text-xs text-warm-500 mt-1.5">
            <strong>{customers.length}</strong> {customers.length === 1 ? "cliente" : "clienti"}
            {selected.size > 0 && <> · <strong>{selected.size}</strong> selezionati</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 ? (
            <>
              <button
                onClick={() => setBulkEmailOpen(true)}
                className="inline-flex items-center gap-2 bg-warm-900 hover:bg-warm-800 text-white px-4 py-2 rounded text-sm font-medium"
              >
                <Mail size={14} /> Invia email ({selected.size})
              </button>
              <button onClick={() => setSelected(new Set())} className="text-sm text-warm-600 hover:text-warm-900 underline">
                Annulla selezione
              </button>
            </>
          ) : (
            <ImportExportButtons
              exportUrl={exportUrl}
              exportLabel="Esporta clienti CSV"
              importUrl="/api/store/customers/import"
              importColumns={{
                email: ["email", "e-mail", "mail"],
                firstName: ["firstname", "nome"],
                lastName: ["lastname", "cognome"],
                phone: ["phone", "telefono", "cellulare"],
                marketingOptIn: ["marketing", "marketingoptin", "newsletter"],
              }}
              exampleCsv={"email,firstName,lastName,phone,marketing\nmario.rossi@example.com,Mario,Rossi,+39 333 1234567,si\n"}
              templateFilename="clienti-template.csv"
              onImported={fetchAll}
            />
          )}
        </div>
      </header>

      <div className="bg-white border border-warm-200 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[280px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per email, nome, telefono…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none"
          />
        </div>
        <select
          value={hasOrders}
          onChange={(e) => setHasOrders(e.target.value as "" | "true" | "false")}
          className="px-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none bg-white"
        >
          <option value="">Tutti</option>
          <option value="true">Solo con ordini</option>
          <option value="false">Senza ordini</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          className="px-3 py-2 border border-warm-200 rounded text-sm focus:border-warm-700 outline-none bg-white ml-auto"
          title="Numero di clienti per pagina"
        >
          <option value="20">Per pagina: 20</option>
          <option value="50">Per pagina: 50</option>
          <option value="100">Per pagina: 100</option>
          <option value="200">Per pagina: 200</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun cliente. I clienti vengono creati automaticamente al primo checkout.
        </div>
      ) : (
        <>
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {customers.map((c) => {
            const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
            return (
              <Link
                key={c.id}
                href={`/admin/store/customers/${c.id}`}
                className="block bg-white rounded-lg border border-warm-200 p-3 active:bg-warm-50"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-warm-900 truncate">{fullName}</div>
                    <div className="text-[11px] text-warm-500 font-mono truncate">{c.email}</div>
                    {c.phone && <div className="text-[11px] text-warm-500">☎ {c.phone}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {c.lifetimeCents > 0 && (
                      <div className="font-mono font-semibold text-warm-900 text-[14px]">{euro(c.lifetimeCents, c.currency)}</div>
                    )}
                    {c.ordersCount > 0 && (
                      <div className="text-[11px] text-warm-500 inline-flex items-center gap-1">
                        <ShoppingCart size={11} /> {c.ordersCount} {c.ordersCount === 1 ? "ordine" : "ordini"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-[10px]">
                  {c.isGuest ? (
                    <span className="text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded">Guest</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Registrato</span>
                  )}
                  {c.marketingOptIn && <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">📧</span>}
                  <span className="text-warm-400 ml-auto">{new Date(c.createdAt).toLocaleDateString("it-IT")}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="px-4 py-4 text-left w-10" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="accent-warm-800" />
                </th>
                <SortableTh field="firstName" sortField={sortBy} sortDir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }}>Cliente</SortableTh>
                <SortableTh field="email" sortField={sortBy} sortDir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }}>Contatti</SortableTh>
                <th className="px-4 py-4 text-center text-xs font-semibold text-warm-700">Ordini</th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-warm-700">Speso totale</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-warm-700">Tipo</th>
                <SortableTh field="createdAt" sortField={sortBy} sortDir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }}>Registrato</SortableTh>
                <th className="px-4 py-4 text-center text-xs font-semibold text-warm-700 w-52">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {customers.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/admin/store/customers/${c.id}`)}
                    className={`hover:bg-warm-50/50 cursor-pointer ${selected.has(c.email) ? "bg-warm-50" : ""}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.email)} onChange={() => toggleSelect(c.email)} className="accent-warm-800" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-warm-900">{fullName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-warm-700 font-mono text-xs">{c.email}</div>
                      {c.phone && <div className="text-warm-500 text-xs">☎ {c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.ordersCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-warm-700">
                          <ShoppingCart size={12} /> {c.ordersCount}
                        </span>
                      ) : (
                        <span className="text-warm-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-warm-900">
                      {c.lifetimeCents > 0 ? euro(c.lifetimeCents, c.currency) : <span className="text-warm-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.isGuest ? (
                        <span className="text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded">Guest</span>
                      ) : (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Registrato</span>
                      )}
                      {c.marketingOptIn && (
                        <span className="ml-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">📧</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-warm-500">
                      {new Date(c.createdAt).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, c)}
                        title="Elimina definitivamente il cliente"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      <BulkEmailModal
        open={bulkEmailOpen}
        onClose={() => setBulkEmailOpen(false)}
        emails={Array.from(selected)}
        contextLabel="clienti"
      />
    </div>
  );
}
