"use client";

/**
 * Progress bar del carosello disegnata in SVG.
 *
 * Usare SVG elimina sub-pixel rounding / antialias / transition glitch che
 * affliggevano le versioni basate su div + clip-path / left+width: il bordo
 * sinistro del segmento nero è garantito a x=0 quando progress=0.
 *
 * - `progress` = posizione di scroll in [0, 1]
 * - `visibleFraction` = clientWidth / scrollWidth in (0, 1]
 *
 * Se `visibleFraction >= 1` (contenuto non scrollabile) la barra non viene
 * renderizzata.
 *
 * Layout: viewBox "0 0 100 3" con preserveAspectRatio="none" → la barra si
 * stira orizzontalmente alla larghezza del container. La grigia è 1px al
 * centro verticale (y=1, h=1); la nera sporge 1px sopra e sotto (y=0, h=3)
 * quindi ha 1px di spessore in più come richiesto.
 */
export default function CarouselProgressBar({
  progress,
  visibleFraction,
  className = "",
  grayColor = "rgb(230,230,228)", // warm-200 circa
  blackColor = "rgb(10,10,10)",   // warm-900 circa
  transitionMs = 180,
}: {
  progress: number;
  visibleFraction: number;
  className?: string;
  grayColor?: string;
  blackColor?: string;
  transitionMs?: number;
}) {
  if (visibleFraction >= 0.999) return null;

  const p = Math.max(0, Math.min(1, progress));
  const vf = Math.max(0.02, Math.min(1, visibleFraction));
  const segWidth = vf * 100;
  const segX = p * (100 - segWidth);

  return (
    <div className={`max-w-[780px] mx-auto px-4 ${className}`}>
      <svg
        viewBox="0 0 100 3"
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: 3 }}
        aria-hidden="true"
      >
        <rect x="0" y="1" width="100" height="1" fill={grayColor} />
        <rect
          x={segX}
          y="0"
          width={segWidth}
          height="3"
          fill={blackColor}
          style={{ transition: `x ${transitionMs}ms ease-out, width ${transitionMs}ms ease-out` }}
        />
      </svg>
    </div>
  );
}
