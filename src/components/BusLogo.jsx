/**
 * BusLogo — Logotipo SVG premium del furgón escolar.
 * Reutilizable en Login y Registro.
 */
export default function BusLogo({ className = '', size = 'default' }) {
  const sizes = {
    small: 'w-16 h-11',
    default: 'w-28 h-20',
    large: 'w-36 h-24',
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Glow ring behind the bus */}
      <div className="relative">
        <div className="absolute inset-0 bg-cream rounded-full blur-2xl scale-150" />
        <svg
          viewBox="0 0 140 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizes[size]} drop-shadow-lg relative z-10`}
          aria-hidden="true"
        >
          {/* Shadow under bus */}
          <ellipse cx="70" cy="84" rx="50" ry="5" fill="#000" opacity="0.07" />
          {/* Body */}
          <rect x="12" y="18" width="116" height="46" rx="10" fill="url(#busGrad)" />
          {/* Roof */}
          <rect x="22" y="12" width="96" height="10" rx="5" fill="var(--amber)" />
          {/* Light bar */}
          <rect x="50" y="6" width="40" height="8" rx="4" fill="var(--red)" />
          <rect x="56" y="8" width="12" height="4" rx="2" fill="var(--red)" />
          <rect x="72" y="8" width="12" height="4" rx="2" fill="var(--red)" />
          {/* Windows */}
          {[20, 44, 68, 92].map((x) => (
            <g key={x}>
              <rect x={x} y="24" width="22" height="16" rx="4" fill="var(--muted)" />
              <rect x={x} y="24" width="22" height="16" rx="4" fill="white" opacity="0.55" />
            </g>
          ))}
          {/* Door */}
          <rect x="118" y="28" width="8" height="28" rx="2" fill="var(--amber)" />
          <circle cx="121" cy="42" r="1.5" fill="var(--muted)" />
          {/* Bumper */}
          <rect x="16" y="58" width="108" height="7" rx="3.5" fill="var(--amber)" />
          {/* Wheels */}
          <circle cx="36" cy="72" r="10" fill="var(--ink)" />
          <circle cx="104" cy="72" r="10" fill="var(--ink)" />
          <circle cx="36" cy="72" r="5" fill="var(--muted)" />
          <circle cx="104" cy="72" r="5" fill="var(--muted)" />
          <circle cx="36" cy="72" r="2" fill="var(--muted)" />
          <circle cx="104" cy="72" r="2" fill="var(--muted)" />
          {/* Headlights */}
          <rect x="12" y="44" width="5" height="8" rx="2.5" fill="var(--amber)" />
          <rect x="123" y="44" width="5" height="8" rx="2.5" fill="var(--amber)" />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="busGrad" x1="12" y1="18" x2="12" y2="64">
              <stop stopColor="#FBBF24" />
              <stop offset="1" stopColor="#FFB800" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Ruta<span style={{ color: 'var(--amber)' }}>Segura</span>
        </h1>
        <p className="text-xs sm:text-sm font-medium mt-0.5 tracking-wide">
          Transporte escolar inteligente
        </p>
      </div>
    </div>
  );
}