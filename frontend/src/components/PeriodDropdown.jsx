import { useEffect, useRef, useState } from 'react';

import { CUSTOM_RANGE_START, todayInBusinessTz } from '../utils/businessDate';

const RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const dateInput =
  'h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-(--c-accent) focus:ring-2 focus:ring-(--c-accent)/20';

/** The period filter as a compact dropdown (for the top bar). Same values as PeriodFilter: onChange({ range, from?, to? }). */
function PeriodDropdown({ filter, onChange, align = 'left', block = false }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(filter.from || CUSTOM_RANGE_START);
  const [to, setTo] = useState(() => filter.to || todayInBusinessTz());
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const current = RANGES.find((item) => item.value === filter.range) ?? RANGES[1];
  const customOpen = filter.range === 'custom';
  const canApply = from && to && from <= to;

  return (
    <div ref={box} className={`relative ${block ? 'min-w-0 flex-1' : 'shrink-0'}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Period of the leads"
        className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-(--c-text-2) transition hover:border-(--c-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent) ${block ? 'w-full' : ''}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-(--c-link)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12" rx="2" />
          <path d="M3 8.5h14M7 3v3M13 3v3" />
        </svg>
        <span className={`whitespace-nowrap ${block ? 'min-w-0 flex-1 truncate text-left' : ''}`}>{current.label}</span>
        <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_12px_32px_rgba(20,33,61,0.16)]`}>
          <ul role="listbox" aria-label="Period" className="flex flex-col gap-0.5">
            {RANGES.map(({ value, label }) => {
              const active = filter.range === value;
              return (
                <li key={value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      if (value === 'custom') onChange({ range: 'custom', from, to });
                      else {
                        onChange({ range: value });
                        setOpen(false);
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      active ? 'bg-(--c-accent-soft) text-(--c-link)' : 'text-(--c-text-2) hover:bg-gray-50'
                    }`}
                  >
                    {label}
                    {active && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {customOpen && (
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 px-1 pt-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-(--c-muted)">
                From
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-(--c-muted)">
                To
                <input type="date" value={to} min={from || undefined} max={todayInBusinessTz()} onChange={(e) => setTo(e.target.value)} className={dateInput} />
              </label>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => {
                  onChange({ range: 'custom', from, to });
                  setOpen(false);
                }}
                className="h-9 cursor-pointer rounded-lg bg-(--c-text) text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PeriodDropdown;
