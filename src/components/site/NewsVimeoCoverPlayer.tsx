"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Maximize2, Volume2, VolumeX } from "lucide-react";

/**
 * Player Vimeo con cover-fit + barra controlli custom centrata.
 *
 * Perché: nel blocco image_text_bg il container è portrait (3/4.2) ma il video
 * è 16/9 nativo. Con cover-fit l'iframe sborda lateralmente e la barra
 * controlli nativa di Vimeo viene croppata sui lati (play e fullscreen non
 * visibili). Soluzione: iframe in modalità `background=1` (niente UI nativa)
 * + nostra barra controlli overlay, larga 100% del CONTAINER (non dell'iframe)
 * quindi sempre interamente visibile.
 *
 * Usa Vimeo Player SDK caricato on-demand (5 KB, una sola volta per pagina).
 */

// Singleton loader del Player SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vimeoSdkPromise: Promise<any> | null = null;
function loadVimeoSdk() {
  if (vimeoSdkPromise) return vimeoSdkPromise;
  vimeoSdkPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.Vimeo) return resolve(w.Vimeo);
    const s = document.createElement("script");
    s.src = "https://player.vimeo.com/api/player.js";
    s.async = true;
    s.onload = () => resolve(w.Vimeo);
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
  return vimeoSdkPromise;
}

interface Props {
  vimeoId: string;
  autoplay?: boolean;
}

export default function NewsVimeoCoverPlayer({ vimeoId, autoplay }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(!!autoplay);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadVimeoSdk().then((Vimeo) => {
      if (cancelled || !iframeRef.current || !Vimeo) return;
      const p = new Vimeo.Player(iframeRef.current);
      playerRef.current = p;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.on("play", () => setPlaying(true));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.on("pause", () => setPlaying(false));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.on("volumechange", ({ volume }: any) => setMuted(volume === 0));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.on("timeupdate", ({ seconds, duration: d }: any) => {
        setCurrent(seconds);
        if (d && d !== duration) setDuration(d);
      });
      p.getDuration().then((d: number) => setDuration(d || 0)).catch(() => {});
    }).catch(() => { /* SDK non caricabile: la barra controlli non funzionerà ma il video va comunque */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = async () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const paused = await p.getPaused();
      if (paused) p.play();
      else p.pause();
    } catch { /* ignore */ }
  };
  const toggleMute = async () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const v = await p.getVolume();
      p.setVolume(v === 0 ? 1 : 0);
    } catch { /* ignore */ }
  };
  const goFullscreen = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = iframeRef.current as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };
  const seekFromEvent = (clientX: number, rect: DOMRect) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    p.setCurrentTime(ratio * duration).catch(() => {});
  };
  const onScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromEvent(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration ? Math.min(1, current / duration) : 0;
  const params = autoplay ? "background=1" : "background=1&autoplay=0&muted=0";

  return (
    <>
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${vimeoId}?${params}`}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          height: "100%",
          aspectRatio: "16 / 9",
          minWidth: "100%",
          transform: "translate(-50%, -50%)",
          border: 0,
        }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
      {/* Barra controlli custom: 100% larghezza container, sempre visibile.
          Posizionata sopra il bordo bottom + gradient semi-trasparente per
          leggibilità sopra qualsiasi frame del video. */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-3 pt-6 pb-2 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)" }}
      >
        <div className="flex items-center gap-2 text-white text-xs pointer-events-auto">
          <button type="button" onClick={togglePlay} className="p-1 hover:opacity-80 transition-opacity" aria-label={playing ? "Pausa" : "Play"}>
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <span className="font-mono tabular-nums w-9 text-[11px]">{fmt(current)}</span>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Scorri video"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={current}
            onClick={onScrubClick}
            className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          <span className="font-mono tabular-nums w-9 text-white/70 text-[11px]">{fmt(duration)}</span>
          <button type="button" onClick={toggleMute} className="p-1 hover:opacity-80 transition-opacity" aria-label={muted ? "Riattiva audio" : "Disattiva audio"}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button type="button" onClick={goFullscreen} className="p-1 hover:opacity-80 transition-opacity" aria-label="Schermo intero">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
