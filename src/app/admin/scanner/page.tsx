"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Keyboard, CheckCircle2, AlertCircle, X, Camera, LogOut } from "lucide-react";

interface ScanResult {
  type: "success" | "already" | "error";
  message: string;
  name?: string;
  time?: string;
}

const COOLDOWN_MS = 3000; // ignore same QR for 3 seconds

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [eventName, setEventName] = useState("");
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout>();
  const overlayTimeoutRef = useRef<NodeJS.Timeout>();
  const manualInputRef = useRef<HTMLInputElement>(null);
  // Synchronous lock to prevent duplicate scans (React state is async)
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  // Fetch event info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.scanLandingPageId) {
          fetch(`/api/landing-page-config?admin=true&id=${data.scanLandingPageId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.data) setEventName(d.data.name || "Evento");
            })
            .catch(() => {});
          fetch(`/api/event-registrations?landingPageId=${data.scanLandingPageId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.success) {
                setStats({ total: d.data.length, checkedIn: d.data.filter((r: { checkedIn: boolean }) => r.checkedIn).length });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const doCheckin = useCallback(async (qrCode: string) => {
    const trimmed = qrCode.trim();
    if (!trimmed) return;

    // Synchronous lock check (ref, not state)
    if (isProcessingRef.current) return;

    // Cooldown: ignore same QR code within COOLDOWN_MS
    const now = Date.now();
    if (lastScannedRef.current.code === trimmed && now - lastScannedRef.current.time < COOLDOWN_MS) return;

    // Lock immediately (synchronous)
    isProcessingRef.current = true;
    lastScannedRef.current = { code: trimmed, time: now };
    setProcessing(true);

    try {
      const r = await fetch("/api/event-registrations/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: trimmed }),
      });
      const d = await r.json();

      let result: ScanResult;
      if (d.success && !d.alreadyCheckedIn) {
        result = { type: "success", message: "Check-in OK!", name: `${d.data.firstName} ${d.data.lastName}`, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
        setStats((prev) => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
        try { navigator.vibrate([100, 50, 100]); } catch {}
      } else if (d.success && d.alreadyCheckedIn) {
        result = { type: "already", message: "Già registrato", name: `${d.data.firstName} ${d.data.lastName}`, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
        try { navigator.vibrate([200]); } catch {}
      } else {
        result = { type: "error", message: d.error || "QR non valido" };
        try { navigator.vibrate([200]); } catch {}
      }

      setLastResult(result);
      setHistory((prev) => [result, ...prev].slice(0, 50));

      // Show fullscreen overlay
      setShowOverlay(true);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 2500);

      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = setTimeout(() => setLastResult(null), 5000);
    } catch {
      const errResult: ScanResult = { type: "error", message: "Errore di connessione" };
      setLastResult(errResult);
      setShowOverlay(true);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 2500);
    }

    setProcessing(false);
    isProcessingRef.current = false;
    setManualCode("");
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (scanning || !videoRef.current) return;
    setScanning(true);
    setManualMode(false);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scanner-video");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 5, disableFlip: false },
        (decodedText: string) => {
          doCheckin(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Camera error:", err);
      setScanning(false);
      setManualMode(true);
    }
  }, [scanning, doCheckin]);

  // Stop camera
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (scannerRef.current as any).stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    const timer = setTimeout(() => startCamera(), 500);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus manual input when switching
  useEffect(() => {
    if (manualMode && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [manualMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) doCheckin(manualCode.trim());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const resultColors = {
    success: "bg-green-500",
    already: "bg-amber-500",
    error: "bg-red-500",
  };

  const overlayConfig = {
    success: { bg: "bg-green-500", icon: <CheckCircle2 size={80} className="text-white" />, label: "CHECK-IN RIUSCITO" },
    already: { bg: "bg-amber-500", icon: <AlertCircle size={80} className="text-white" />, label: "GIÀ REGISTRATO" },
    error: { bg: "bg-red-500", icon: <X size={80} className="text-white" />, label: "NON VALIDO" },
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ touchAction: "manipulation" }}>
      {/* Fullscreen result overlay */}
      {showOverlay && lastResult && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${overlayConfig[lastResult.type].bg} transition-opacity duration-300`}
          onClick={() => setShowOverlay(false)}
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          <div style={{ animation: "scaleIn 0.25s ease-out" }}>
            {overlayConfig[lastResult.type].icon}
          </div>
          <p className="text-white text-2xl font-bold mt-6 tracking-wider">
            {overlayConfig[lastResult.type].label}
          </p>
          {lastResult.name && (
            <p className="text-white/90 text-xl mt-3">{lastResult.name}</p>
          )}
          <p className="text-white/50 text-sm mt-8">Tocca per chiudere</p>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}

      {/* Header */}
      <div className="bg-black/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <QrCode size={16} /> Scanner
          </h1>
          {eventName && <p className="text-white/50 text-[10px] mt-0.5">{eventName}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white text-sm font-bold">{stats.checkedIn}/{stats.total}</div>
            <div className="text-white/40 text-[10px]">check-in</div>
          </div>
          <button onClick={handleLogout} className="p-2 text-white/40 hover:text-white" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Result banner */}
      {lastResult && !showOverlay && (
        <div className={`${resultColors[lastResult.type]} px-4 py-3 flex items-center gap-3 shrink-0 z-10`}>
          {lastResult.type === "success" ? <CheckCircle2 size={24} className="text-white shrink-0" /> :
           lastResult.type === "already" ? <AlertCircle size={24} className="text-white shrink-0" /> :
           <X size={24} className="text-white shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm">{lastResult.message}</div>
            {lastResult.name && <div className="text-white/80 text-xs truncate">{lastResult.name}</div>}
          </div>
        </div>
      )}

      {/* Camera / Manual */}
      <div className="flex-1 relative overflow-hidden">
        {!manualMode ? (
          <>
            <div id="scanner-video" ref={videoRef} className="absolute inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_#qr-shaded-region]:!hidden [&_img]:!hidden" style={{ border: "none" }} />
            {/* Scan overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
                </div>
              </div>
            )}
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <button onClick={startCamera} className="flex flex-col items-center gap-4 text-white/60">
                  <Camera size={48} />
                  <span className="text-sm">Tocca per attivare la fotocamera</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm">
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-3 text-center">Inserisci codice QR manualmente</label>
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Codice QR..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-center font-mono text-lg placeholder-white/30 focus:outline-none focus:border-white/50"
                autoComplete="off"
              />
              <button type="submit" disabled={processing || !manualCode.trim()}
                className="w-full mt-4 bg-white text-black py-4 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-30">
                {processing ? "Verifica..." : "Check-in"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom bar: mode toggle + history */}
      <div className="bg-black/80 backdrop-blur shrink-0 z-10">
        {/* Mode toggle */}
        <div className="flex border-t border-white/10">
          <button onClick={() => { stopCamera(); setManualMode(false); setTimeout(startCamera, 300); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium ${!manualMode ? "text-white bg-white/10" : "text-white/40"}`}>
            <Camera size={16} /> Fotocamera
          </button>
          <button onClick={() => { stopCamera(); setManualMode(true); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium ${manualMode ? "text-white bg-white/10" : "text-white/40"}`}>
            <Keyboard size={16} /> Manuale
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="max-h-32 overflow-y-auto border-t border-white/10">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
                {h.type === "success" ? <CheckCircle2 size={14} className="text-green-400 shrink-0" /> :
                 h.type === "already" ? <AlertCircle size={14} className="text-amber-400 shrink-0" /> :
                 <X size={14} className="text-red-400 shrink-0" />}
                <span className="text-white/70 text-xs truncate flex-1">{h.name || h.message}</span>
                {h.time && <span className="text-white/30 text-[10px] shrink-0">{h.time}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
