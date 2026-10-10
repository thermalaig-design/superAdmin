import { useId } from 'react';

import { useStoredToggle } from '../hooks/useStoredToggle';

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}

/**
 * The overview band used at the top of the insight pages: a soft panel with the headline numbers on the left
 * and the graph in its own white card on the right (stacked on small screens).
 *
 * The strip along the top collapses the panel to give the table below more room. `summary` is a short line
 * shown while collapsed, and `storageKey` remembers whether the user left it open or closed.
 */
function OverviewPanel({ stats, chart, summary, storageKey, className = '' }) {
  const [collapsed, toggle] = useStoredToggle(storageKey, false);
  const bodyId = useId();

  return (
    <section className={`rounded-2xl border border-[#ebe0d7] bg-[#f7efe9] ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={collapsed ? 'Show details and graph' : 'Hide details and graph'}
          title={collapsed ? 'Show details and graph' : 'Hide details and graph'}
          className="-ml-1.5  inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs sm:min-h-0 sm:px-1.5 font-semibold uppercase tracking-[0.08em] text-[#6b7188] transition hover:bg-[#ebe0d7]/60 hover:text-[#14213d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#e8793f]"
        >
          <Chevron open={!collapsed} />
          {/* Details &amp; graph */}
        </button>

        {collapsed && summary && <p className="min-w-0 truncate text-xs text-[#6b7188]">{summary}</p>}
      </div>

      {/* Height animates between 0 and its natural size; `inert` keeps hidden content out of the tab order. */}
      <div
        id={bodyId}
        inert={collapsed}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[12fr_9fr]">
            {stats}
            <div className="min-w-0 rounded-xl border border-[#ebe0d7] bg-white p-4 shadow-[0_1px_2px_rgba(80,40,20,0.05)]">{chart}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OverviewPanel;
