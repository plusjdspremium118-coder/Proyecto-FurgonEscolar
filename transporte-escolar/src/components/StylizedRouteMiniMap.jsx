import { useState, useEffect } from 'react';

/**
 * StylizedRouteMiniMap — Mapa de ruta estilizado idéntico al de la imagen de referencia.
 * Fondo verde menta suave (#EAF5E9), línea verde discontinua, bus escolar interactivo y pin "Casa".
 */
export default function StylizedRouteMiniMap({
  isDriving = true,
  destinationName = 'Casa',
  onExpandMap,
  className = '',
}) {
  const [busProgress, setBusProgress] = useState(0.22);

  useEffect(() => {
    if (!isDriving) return;
    const interval = setInterval(() => {
      setBusProgress((prev) => {
        const next = prev + 0.035;
        return next > 0.88 ? 0.15 : next;
      });
    }, 1600);
    return () => clearInterval(interval);
  }, [isDriving]);

  // Coordenadas calculadas para el camino de la imagen
  function getBusCoords(progress) {
    const points = [
      { x: 38, y: 32 },
      { x: 74, y: 32 },
      { x: 74, y: 78 },
      { x: 148, y: 78 },
      { x: 148, y: 40 },
      { x: 220, y: 40 },
      { x: 220, y: 95 },
      { x: 265, y: 95 },
    ];

    const totalSegments = points.length - 1;
    const targetIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
    const subProgress = (progress * totalSegments) - targetIndex;

    const p1 = points[targetIndex];
    const p2 = points[targetIndex + 1];

    const currentX = p1.x + (p2.x - p1.x) * subProgress;
    const currentY = p1.y + (p2.y - p1.y) * subProgress;

    return { x: currentX, y: currentY };
  }

  const busPos = getBusCoords(busProgress);

  return (
    <div
      onClick={onExpandMap}
      className={`relative w-full h-[125px] sm:h-[135px] rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-300 hover:shadow-sm ${className}`}
      style={{
        background: '#E9F5E8', // Verde menta suave exacto
        border: '1px solid rgba(76, 175, 80, 0.18)',
      }}
      title="Toca para ver el mapa satelital completo"
    >
      {/* Botón flotante para ver mapa GPS interactivo */}
      {onExpandMap && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpandMap();
          }}
          className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 transition-all active:scale-95"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(6px)',
            color: '#2E7D32',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            border: '1px solid rgba(46, 125, 50, 0.2)'
          }}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          GPS
        </button>
      )}

      {/* SVG del camino verde discontinuo */}
      <svg
        className="w-full h-full"
        viewBox="0 0 310 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Sombra suave de la ruta */}
        <path
          d="M 38 32 L 74 32 L 74 78 L 148 78 L 148 40 L 220 40 L 220 95 L 265 95"
          stroke="#C8E6C9"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ruta verde con puntos/guiones exactos como en la imagen */}
        <path
          d="M 38 32 L 74 32 L 74 78 L 148 78 L 148 40 L 220 40 L 220 95 L 265 95"
          stroke="#4CAF50"
          strokeWidth="3.5"
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Marcador final: Círculo verde con halo */}
        <circle cx="265" cy="95" r="8" fill="#E9F5E8" stroke="#2E7D32" strokeWidth="2.5" />
        <circle cx="265" cy="95" r="3.5" fill="#2E7D32" />
      </svg>

      {/* Pin del Bus en movimiento animado */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
        style={{
          left: `${(busPos.x / 310) * 100}%`,
          top: `${(busPos.y / 125) * 100}%`,
        }}
      >
        <div
          className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs shadow-md"
          style={{
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
            border: '2px solid #FFC107',
          }}
        >
          <span role="img" aria-label="furgón">🚌</span>
        </div>
      </div>

      {/* Badge "Casa" como en la imagen */}
      <div
        className="absolute z-10 -translate-x-1/2 translate-y-1 pointer-events-none"
        style={{
          left: `${(265 / 310) * 100}%`,
          top: `${(95 / 125) * 100}%`,
        }}
      >
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs"
          style={{
            background: 'white',
            color: '#F59E0B',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          {destinationName}
        </div>
      </div>
    </div>
  );
}
