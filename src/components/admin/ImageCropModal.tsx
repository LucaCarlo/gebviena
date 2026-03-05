"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  aspectRatio: number; // width / height, e.g. 16/9
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

export default function ImageCropModal({ open, imageSrc, aspectRatio, onCrop, onClose }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Crop area in image-space coordinates
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
  const dragStartRef = useRef({ mx: 0, my: 0, cx: 0, cy: 0, cw: 0, ch: 0 });

  // Load image and compute initial crop
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      setImgSize({ w: iw, h: ih });

      // Compute largest centered crop at the desired aspect ratio
      let cw: number, ch: number;
      if (iw / ih > aspectRatio) {
        ch = ih;
        cw = Math.round(ih * aspectRatio);
      } else {
        cw = iw;
        ch = Math.round(iw / aspectRatio);
      }
      const cx = Math.round((iw - cw) / 2);
      const cy = Math.round((ih - ch) / 2);
      setCropArea({ x: cx, y: cy, w: cw, h: ch });
    };
    img.src = imageSrc;
  }, [open, imageSrc, aspectRatio]);

  // Compute display scale so image fits container
  useEffect(() => {
    if (!containerRef.current || imgSize.w === 0) return;
    const maxW = containerRef.current.clientWidth - 32;
    const maxH = containerRef.current.clientHeight - 32;
    const scale = Math.min(maxW / imgSize.w, maxH / imgSize.h, 1);
    setDisplayScale(scale);
  }, [imgSize]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || imgSize.w === 0) return;

    const dw = Math.round(imgSize.w * displayScale);
    const dh = Math.round(imgSize.h * displayScale);
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d")!;

    // Draw image
    ctx.drawImage(img, 0, 0, dw, dh);

    // Dark overlay outside crop
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, dw, dh);

    // Clear the crop area (show bright)
    const sx = cropArea.x * displayScale;
    const sy = cropArea.y * displayScale;
    const sw = cropArea.w * displayScale;
    const sh = cropArea.h * displayScale;
    ctx.clearRect(sx, sy, sw, sh);
    ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.w, cropArea.h, sx, sy, sw, sh);

    // Crop border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    // Rule of thirds lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const lx = sx + (sw / 3) * i;
      const ly = sy + (sh / 3) * i;
      ctx.beginPath(); ctx.moveTo(lx, sy); ctx.lineTo(lx, sy + sh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + sw, ly); ctx.stroke();
    }

    // Corner handles
    const hs = 10;
    ctx.fillStyle = "#fff";
    const corners = [
      [sx, sy], [sx + sw - hs, sy],
      [sx, sy + sh - hs], [sx + sw - hs, sy + sh - hs],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, hs, hs);
    }
  }, [cropArea, imgSize, displayScale]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse handlers
  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / displayScale,
      y: (e.clientY - rect.top) / displayScale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    const hs = 12 / displayScale;

    // Check if near bottom-right corner for resize
    const brx = cropArea.x + cropArea.w;
    const bry = cropArea.y + cropArea.h;
    if (Math.abs(pos.x - brx) < hs && Math.abs(pos.y - bry) < hs) {
      setDragging("resize");
      dragStartRef.current = { mx: pos.x, my: pos.y, cx: cropArea.x, cy: cropArea.y, cw: cropArea.w, ch: cropArea.h };
      return;
    }

    // Check if inside crop area for move
    if (pos.x >= cropArea.x && pos.x <= cropArea.x + cropArea.w &&
        pos.y >= cropArea.y && pos.y <= cropArea.y + cropArea.h) {
      setDragging("move");
      dragStartRef.current = { mx: pos.x, my: pos.y, cx: cropArea.x, cy: cropArea.y, cw: cropArea.w, ch: cropArea.h };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const pos = getPos(e);
    const { mx, my, cx, cy, cw, ch } = dragStartRef.current;
    const dx = pos.x - mx;
    const dy = pos.y - my;

    if (dragging === "move") {
      let nx = cx + dx;
      let ny = cy + dy;
      nx = Math.max(0, Math.min(imgSize.w - cw, nx));
      ny = Math.max(0, Math.min(imgSize.h - ch, ny));
      setCropArea({ x: Math.round(nx), y: Math.round(ny), w: cw, h: ch });
    } else if (dragging === "resize") {
      // Resize from bottom-right, maintaining aspect ratio
      let nw = cw + dx;
      nw = Math.max(50, Math.min(imgSize.w - cx, nw));
      let nh = Math.round(nw / aspectRatio);
      if (cy + nh > imgSize.h) {
        nh = imgSize.h - cy;
        nw = Math.round(nh * aspectRatio);
      }
      setCropArea({ x: cx, y: cy, w: Math.round(nw), h: Math.round(nh) });
    }
  };

  const handleMouseUp = () => setDragging(null);

  // Reset crop to max centered
  const handleReset = () => {
    let cw: number, ch: number;
    if (imgSize.w / imgSize.h > aspectRatio) {
      ch = imgSize.h;
      cw = Math.round(imgSize.h * aspectRatio);
    } else {
      cw = imgSize.w;
      ch = Math.round(imgSize.w / aspectRatio);
    }
    setCropArea({
      x: Math.round((imgSize.w - cw) / 2),
      y: Math.round((imgSize.h - ch) / 2),
      w: cw,
      h: ch,
    });
  };

  // Execute crop
  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = cropArea.w;
    offscreen.height = cropArea.h;
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.w, cropArea.h, 0, 0, cropArea.w, cropArea.h);

    offscreen.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, "image/png");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] w-[800px] flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
          <div>
            <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Ritaglia immagine</h3>
            <p className="text-[10px] text-warm-400 mt-0.5">
              Trascina per spostare, angolo in basso a destra per ridimensionare
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-warm-400 hover:text-warm-600">
            <X size={20} />
          </button>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 bg-neutral-900 min-h-[400px] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-warm-200">
          <div className="text-[10px] text-warm-400">
            {cropArea.w} x {cropArea.h} px
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-50"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="button"
              onClick={handleCrop}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-warm-800 text-white hover:bg-warm-900"
            >
              <Check size={14} /> Applica ritaglio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
