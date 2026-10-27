const DOTS = 8;

/**
 * A ring of dots that fade round one after another, in the middle of the box it sits in, shown while new data is on
 * its way (the old data stays on screen, dimmed). The box must be `relative`; pass className="fixed inset-0 z-30 ..."
 * to centre it on the screen instead. `as` is the element to render (a list needs 'li').
 */
function LoadingBar({ active, className = 'absolute inset-0 z-10', as: Tag = 'div' }) {
  if (!active) return null;
  return (
    <Tag role="progressbar" aria-label="Loading" className={`pointer-events-none flex items-start justify-center pt-16 ${className}`}>
      <span className="relative block h-11 w-11 rounded-full bg-white/80 shadow-md">
        {Array.from({ length: DOTS }, (_, i) => (
          <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * (360 / DOTS)}deg)` }}>
            <span
              className="mx-auto mt-1.5 block h-2 w-2 animate-dot-fade rounded-full bg-(--c-text-2)"
              style={{ animationDelay: `${-((DOTS - i) / DOTS)}s` }}
            />
          </span>
        ))}
      </span>
    </Tag>
  );
}

export default LoadingBar;
