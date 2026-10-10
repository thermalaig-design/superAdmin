import { useDragScroll } from '../hooks/useDragScroll';
import { useScrollEdges } from '../hooks/useScrollEdges';

/**
 * A table that scrolls sideways inside a rounded box when it does not fit. The scrollbar is hidden, so:
 * a mouse can drag the table, touch can swipe, and a soft fade on the left / right edge shows there is more.
 * Every column scrolls together (nothing is pinned). Pass the `<table>` as children, with a `min-w-*` that suits its columns.
 */
function ScrollTable({ children, className = '' }) {
  const scrollRef = useDragScroll();
  const edges = useScrollEdges(scrollRef);

  return (
    <div data-scrolled={edges.left} className={`group relative rounded-xl border border-gray-200 ${className}`}>
      <div ref={scrollRef} className="scrollbar-none cursor-grab overflow-x-auto rounded-xl">
        {children}
      </div>

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-[3] w-8 rounded-l-xl bg-gradient-to-r from-white/80 to-transparent transition-opacity ${
          edges.left ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-[3] w-12 rounded-r-xl bg-gradient-to-l from-white to-transparent transition-opacity ${
          edges.right ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default ScrollTable;
