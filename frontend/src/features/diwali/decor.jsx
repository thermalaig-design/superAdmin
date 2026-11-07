import { launchRocket, useDiwali } from './useDiwali';

// Decorations: bulb string for the navbar, diyas, marigold toran, rangoli and the navbar festival controls.
// Colours come from the per-page --dw-1..--dw-5 variables set by DiwaliFestival, so each page glows differently.

const BULBS = 30;
const ARCS = 10;

/** A string of twinkling bulbs hanging in scallops along the top edge of its (positioned) parent. */
export function DiwaliLights() {
  const [on] = useDiwali();
  if (!on) return null;
  const per = BULBS / ARCS;
  const bulbs = Array.from({ length: BULBS }, (_, i) => {
    const arc = Math.floor(i / per);
    const t = ((i % per) + 0.5) / per;
    const sag = 4 * t * (1 - t) * 9; // px the wire dips at this point
    return { left: ((arc + t) / ARCS) * 100, top: 2 + sag, n: (i % 5) + 1, delay: (i * 0.23) % 1.6 };
  });
  const path = Array.from({ length: ARCS }, (_, a) => `${a === 0 ? `M0 2` : ''} Q${a * 10 + 5} 20 ${(a + 1) * 10} 2`).join(' ');
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-30 h-8 overflow-visible">
      <svg className="absolute inset-x-0 top-0 h-6 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#3a2a1a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" opacity="0.75" />
      </svg>
      {bulbs.map((b, i) => (
        <span key={i} className="dw-bulb" style={{ left: `${b.left}%`, top: `${b.top}px`, '--c': `var(--dw-${b.n})`, '--d': `${b.delay}s` }} />
      ))}
    </div>
  );
}

/** A clay diya with a flickering flame. */
export function Diya({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="dw-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd54f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff9100" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dw-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e65100" />
          <stop offset="1" stopColor="#8d2f00" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="18" r="16" fill="url(#dw-glow)" className="dw-glow" />
      <path className="dw-flame" d="M24 4c3 4.5 5 7.2 5 10.2a5 5 0 0 1-10 0C19 11.2 21 8.5 24 4Z" fill="#ffb300" />
      <path className="dw-flame" d="M24 9c1.6 2.4 2.6 3.8 2.6 5.4a2.6 2.6 0 0 1-5.2 0c0-1.6 1-3 2.6-5.4Z" fill="#fff3c4" />
      <path d="M4 26h40c0 9-8 16-20 16S4 35 4 26Z" fill="url(#dw-clay)" />
      <path d="M4 26h40" stroke="#ffcc80" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 31c4 2 20 2 24 0" stroke="#ffd54f" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

/** Marigold garland that hangs from the top of its parent (the sidebar). */
export function Toran({ className = '' }) {
  const [on] = useDiwali();
  if (!on) return null;
  const flowers = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      <svg viewBox="0 0 288 40" className="h-10 w-full" preserveAspectRatio="none">
        <path d="M0 3Q144 12 288 3" fill="none" stroke="#2e7d32" strokeWidth="2" />
        {flowers.map((i) => {
          const x = 16 + i * 32;
          const y = 3 + 9 * Math.sin((x / 288) * Math.PI);
          return (
            <g key={i} className="dw-sway" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.2}s` }}>
              <line x1={x} y1={y} x2={x} y2={y + 9} stroke="#2e7d32" strokeWidth="1.5" />
              <path d={`M${x} ${y + 8}l-6 9l6 7l6-7Z`} fill="#43a047" />
              <circle cx={x} cy={y + 8} r="5.5" fill={i % 2 ? '#ff9800' : '#ffb300'} />
              <circle cx={x} cy={y + 8} r="2.4" fill="#e65100" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Slowly turning rangoli in the page corner. */
export function Rangoli({ className = '' }) {
  const [on] = useDiwali();
  if (!on) return null;
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg aria-hidden="true" viewBox="-50 -50 100 100" className={`pointer-events-none dw-spin ${className}`}>
      {petals.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0 -14C7 -26 7 -38 0 -46C-7 -38 -7 -26 0 -14Z" fill="var(--dw-1)" opacity="0.9" />
          <path d="M0 -20C3 -27 3 -33 0 -37C-3 -33 -3 -27 0 -20Z" fill="var(--dw-2)" />
          <circle cx="0" cy="-48" r="1.8" fill="var(--dw-3)" />
        </g>
      ))}
      <circle r="12" fill="var(--dw-4)" />
      <circle r="7" fill="var(--dw-2)" />
      <circle r="3" fill="var(--dw-3)" />
    </svg>
  );
}

/** Navbar festival controls: greeting chip, "launch rockets" and fireworks on/off. */
export function DiwaliControls() {
  const [on, toggle] = useDiwali();
  return (
    <div className="flex items-center gap-1.5">
      {on && (
        <span className="dw-chip hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold md:inline-flex">
          <Diya className="h-5 w-5" />
          Happy Diwali
        </span>
      )}
      {on && (
        <button type="button" onClick={launchRocket} title="Launch rockets" aria-label="Launch rockets" className="dw-btn">
          🚀
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? 'Turn Diwali effects off' : 'Turn Diwali effects on'}
        aria-label={on ? 'Turn Diwali effects off' : 'Turn Diwali effects on'}
        className={`dw-btn ${on ? '' : 'opacity-60 grayscale'}`}
      >
        🪔
      </button>
    </div>
  );
}
