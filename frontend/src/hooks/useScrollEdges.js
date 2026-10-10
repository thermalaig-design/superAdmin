import { useEffect, useState } from 'react';

/**
 * Whether a horizontally scrollable element has more content hidden on its left and on its right,
 * so the UI can hint at it (edge fades, a shadow under a fixed column).
 */
export function useScrollEdges(ref) {
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };

    // The observer fires once as soon as it starts watching, which sets the initial state.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    el.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [ref]);

  return edges;
}
