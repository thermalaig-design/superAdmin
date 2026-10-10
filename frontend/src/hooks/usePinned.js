import { useEffect, useState } from 'react';

/**
 * True once a `position: sticky` element has reached its stuck position `offset` px from the top of the
 * screen. Used to let a pinned panel's rows scroll only after the page has scrolled the panel into place.
 */
export function usePinned(ref, offset) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const check = () => setPinned(el.getBoundingClientRect().top <= offset + 1);

    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [ref, offset]);

  return pinned;
}
