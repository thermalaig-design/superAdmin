import { useEffect, useRef, useState } from 'react';

const ease = (t) => 1 - (1 - t) ** 3; // fast start, soft landing

/** A number that counts up to `value` when it appears, and glides to the new number when it changes. `format` turns it into text. */
function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 900 }) {
  const [shown, setShown] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(value)) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = latest.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / duration);
      latest.current = from + (value - from) * ease(t);
      setShown(latest.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return Number.isFinite(value) ? format(shown) : '—';
}

export default CountUp;
