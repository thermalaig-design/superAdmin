import { useRef } from 'react';
import { Link } from 'react-router-dom';

const MAX_TILT = 11; // degrees

/**
 * One headline card that leans toward the pointer in 3D: the card tilts, a soft glare follows the cursor, and the
 * number lifts off the surface. (No tilt for touch screens or "reduce motion": it is only a pointer effect.)
 */
function TiltCard({ accent, to, onSelect, active, label, children }) {
  const card = useRef(null);
  const glare = useRef(null);

  const move = (event) => {
    if (event.pointerType === 'touch') return;
    const box = card.current.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width; // 0 – 1
    const y = (event.clientY - box.top) / box.height;
    const tiltX = ((0.5 - y) * 2 * MAX_TILT).toFixed(2);
    const tiltY = ((x - 0.5) * 2 * MAX_TILT).toFixed(2);
    card.current.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px) scale(1.03)`;
    glare.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.55), transparent 55%)`;
    glare.current.style.opacity = '1';
  };
  const leave = () => {
    card.current.style.transform = '';
    glare.current.style.opacity = '0';
  };

  // a card with a link opens the list behind its number when clicked anywhere
  const Surface = to ? Link : 'div';
  const link = to ? { to, title: `Open ${label}` } : {};
  // a card with onSelect is a button: it picks the card (and shows it is picked)
  const button = onSelect
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': Boolean(active),
        title: `Show ${label} by source`,
        onClick: onSelect,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        },
      }
    : {};

  return (
    <div className="[perspective:900px]">
      <Surface
        {...link}
        {...button}
        ref={card}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ '--accent': accent, transformStyle: 'preserve-3d' }}
        className={`group relative block h-full overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white via-white to-[color-mix(in_srgb,var(--accent)_12%,white)] px-4 py-3 shadow-[0_2px_10px_rgba(20,33,61,0.07)] transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[0_22px_40px_-12px_color-mix(in_srgb,var(--accent)_55%,transparent)] motion-reduce:transform-none motion-reduce:transition-none ${to || onSelect ? 'cursor-pointer' : ''} ${active ? 'ring-2 ring-(--accent)' : ''}`}
      >
        {/* an orb of the card's colour in the corner, a bar along the top */}
        <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-(--accent) opacity-15 blur-xl transition-all duration-300 group-hover:scale-150 group-hover:opacity-30" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-(--accent)" aria-hidden="true" />
        <span ref={glare} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200" aria-hidden="true" />
        {active && (
          <span className="animate-pop pointer-events-none absolute right-2 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-(--accent) text-[0.7rem] font-bold text-white shadow-sm" aria-hidden="true">
            ✓
          </span>
        )}
        <div className="relative" style={{ transform: 'translateZ(28px)' }}>
          {children}
        </div>
      </Surface>
    </div>
  );
}

export default TiltCard;
