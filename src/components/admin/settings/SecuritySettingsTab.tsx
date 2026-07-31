"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Shield, Trash2, RotateCcw, AlertCircle } from "lucide-react";

interface SecuritySettings {
  autoBanEnabled: boolean;
  hitsPerHourThreshold: number;
  hitsPerPathPerHourThreshold: number;
  autoBanDurationHours: number;
}

interface BlockedIpItem {
  id: string;
  ipHash: string;
  reason: string;
  autoBanned: boolean;
  blockedAt: string;
  expiresAt: string | null;
  notes: string | null;
}

export default function SecuritySettingsTab({ showToast }: { showToast: (m: string, t: "success" | "error") => void }) {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [defaults, setDefaults] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ips, setIps] = useState<BlockedIpItem[]>([]);
  const [ipsTotal, setIpsTotal] = useState(0);
  const [ipsLoading, setIpsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/security/settings");
      const j = await r.json();
      if (j.success) { setSettings(j.data); setDefaults(j.defaults); }
    } finally { setLoading(false); }
  }, []);

  const loadIps = useCallback(async () => {
    setIpsLoading(true);
    try {
      const r = await fetch("/api/admin/security/blocked-ips?limit=100");
      const j = await r.json();
      if (j.success) { setIps(j.data.items); setIpsTotal(j.data.total); }
    } finally { setIpsLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); loadIps(); }, [loadSettings, loadIps]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/security/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = await r.json();
      if (j.success) { setSettings(j.data); showToast("Impostazioni sicurezza salvate", "success"); }
      else showToast(j.error || "Errore salvataggio", "error");
    } catch { showToast("Errore di rete", "error"); }
    finally { setSaving(false); }
  };

  const unblock = async (id: string) => {
    if (!confirm("Sbloccare questo IP?")) return;
    try {
      const r = await fetch(`/api/admin/security/blocked-ips/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (j.success) { showToast("IP sbloccato", "success"); loadIps(); }
      else showToast(j.error || "Errore sblocco", "error");
    } catch { showToast("Errore di rete", "error"); }
  };

  const resetToDefaults = () => {
    if (!defaults) return;
    if (!confirm("Ripristinare i valori consigliati?")) return;
    setSettings(defaults);
  };

  const isExpired = (s: string | null) => s ? new Date(s) < new Date() : false;

  if (loading || !settings) {
    return <div className="flex items-center gap-2 text-warm-500"><Loader2 size={16} className="animate-spin" /> Caricamento…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-warm-800 flex items-center gap-2"><Shield size={20} /> Sicurezza / Anti-bot</h2>
        <p className="text-sm text-warm-500 mt-1">
          Configura le regole per bloccare automaticamente gli IP che si comportano come bot (troppi hit in poco tempo,
          scanner ripetuti di una stessa pagina). Le impostazioni si applicano sia al tracker analytics che al cron di ingest log.
        </p>
      </div>

      {/* Toggle + soglie */}
      <div className="bg-white border border-warm-200 rounded-lg p-5 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-700">Auto-ban IP</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoBanEnabled}
            onChange={(e) => setSettings({ ...settings, autoBanEnabled: e.target.checked })}
            className="w-4 h-4 accent-warm-800"
          />
          <span className="text-sm text-warm-800 font-medium">
            Attiva auto-ban degli IP che superano le soglie
            <span className="block text-[11px] text-warm-500 font-normal">
              Se disattivato, solo i blocchi manuali sono validi. Nessun IP viene bannato in automatico.
            </span>
          </span>
        </label>

        <div className="border-t border-warm-100 pt-4 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Hit massimi per ora (per IP)
            </label>
            <input type="number" min={10} max={100000} value={settings.hitsPerHourThreshold}
              onChange={(e) => setSettings({ ...settings, hitsPerHourThreshold: Number(e.target.value) || 300 })}
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
            <p className="text-[11px] text-warm-500 mt-1">
              Un IP che supera <strong>{settings.hitsPerHourThreshold}</strong> pageview in 60 min è quasi sempre un bot.
              Utenti reali stanno a 10-50 pageview/h. Default consigliato: 300.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Hit massimi per ora sullo stesso path
            </label>
            <input type="number" min={5} max={100000} value={settings.hitsPerPathPerHourThreshold}
              onChange={(e) => setSettings({ ...settings, hitsPerPathPerHourThreshold: Number(e.target.value) || 50 })}
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
            <p className="text-[11px] text-warm-500 mt-1">
              Uno scanner spesso ripete la stessa richiesta (es. /login) centinaia di volte.
              Un utente non ricarica una pagina più di 20-30 volte/h. Default: 50.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Durata ban (ore)
            </label>
            <input type="number" min={0} max={24 * 365} value={settings.autoBanDurationHours}
              onChange={(e) => setSettings({ ...settings, autoBanDurationHours: Number(e.target.value) || 168 })}
              className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
            <p className="text-[11px] text-warm-500 mt-1">
              <strong>0</strong> = permanente. Default 168 h = 7 giorni. Dopo il ban, se il bot smette, l&apos;IP viene sbloccato da solo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-warm-100">
          <button type="button" onClick={resetToDefaults} className="inline-flex items-center gap-2 text-sm text-warm-700 hover:text-warm-900">
            <RotateCcw size={14} /> Ripristina valori consigliati
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-warm-800 text-white text-sm px-5 py-2.5 rounded hover:bg-warm-900 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Salva impostazioni sicurezza
          </button>
        </div>
      </div>

      {/* Tabella IP bloccati */}
      <div className="bg-white border border-warm-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-700">
              IP attualmente bloccati ({ipsTotal})
            </h3>
            <p className="text-xs text-warm-500 mt-1">
              Mostro i 100 più recenti. Gli IP scaduti (data grigia) non bloccano più — verranno rimossi dal prossimo cron.
            </p>
          </div>
          <button type="button" onClick={loadIps} disabled={ipsLoading}
            className="text-xs text-warm-600 hover:text-warm-900 underline">
            Aggiorna lista
          </button>
        </div>

        {ips.length === 0 ? (
          <div className="text-center py-8 text-sm text-warm-500 flex flex-col items-center gap-2">
            <AlertCircle size={20} className="text-warm-300" />
            Nessun IP attualmente bloccato.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-warm-600 border-b border-warm-200">
                  <th className="text-left py-2 pr-4">Tipo</th>
                  <th className="text-left py-2 pr-4">IP (hash)</th>
                  <th className="text-left py-2 pr-4">Motivo</th>
                  <th className="text-left py-2 pr-4">Bloccato il</th>
                  <th className="text-left py-2 pr-4">Scade</th>
                  <th className="text-right py-2 pl-4">Azione</th>
                </tr>
              </thead>
              <tbody>
                {ips.map((ip) => (
                  <tr key={ip.id} className="border-b border-warm-100 last:border-none">
                    <td className="py-3 pr-4">
                      <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        ip.autoBanned ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {ip.autoBanned ? "Auto" : "Manuale"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-warm-700" title={ip.ipHash}>
                      {ip.ipHash.slice(0, 12)}…
                    </td>
                    <td className="py-3 pr-4 text-xs text-warm-700 max-w-md truncate" title={ip.reason}>
                      {ip.reason}
                    </td>
                    <td className="py-3 pr-4 text-xs text-warm-500 whitespace-nowrap">
                      {new Date(ip.blockedAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className={`py-3 pr-4 text-xs whitespace-nowrap ${isExpired(ip.expiresAt) ? "text-warm-400 line-through" : "text-warm-700"}`}>
                      {ip.expiresAt ? new Date(ip.expiresAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Permanente"}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button type="button" onClick={() => unblock(ip.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                        <Trash2 size={12} /> Sblocca
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <strong>Come funziona</strong>: il tracker analytics e il cron che importa i log nginx consultano questa lista prima di
        registrare un pageview. Se l&apos;IP è bloccato, la richiesta viene ignorata silenziosamente. L&apos;auto-ban gira
        ogni notte durante l&apos;ingest — se attivato, gli IP che superano le soglie vengono aggiunti automaticamente qui.
      </div>
    </div>
  );
}
