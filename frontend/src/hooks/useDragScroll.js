import { useEffect, useRef } from 'react';

const DRAG_THRESHOLD = 4;
const INTERACTIVE = 'a, button, input, select, textarea, label';

/**
 * Lets a mouse pan a scrollable element by dragging it, so content stays reachable
 * when the scrollbar is hidden. Wheel / trackpad / touch scrolling are left alone.
 */
export function useDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let start = null;
    let dragged = false;

    const onMouseMove = (e) => {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragged = true;
      el.style.userSelect = 'none';
      el.scrollLeft = start.left - dx;
      el.scrollTop = start.top - dy;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.style.userSelect = '';
      el.style.cursor = '';
      start = null;
    };

    const onMouseDown = (e) => {
      dragged = false; // every press starts clean, so a stale drag can't swallow a later click
      if (e.button !== 0 || e.target.closest(INTERACTIVE)) return;
      start = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.style.cursor = 'grabbing';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    // A drag that ends over a link must not also count as a click on it.
    const onClickCapture = (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      onMouseUp();
    };
  }, []);

  return ref;
}
