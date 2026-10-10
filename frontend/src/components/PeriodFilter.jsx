import { useState } from 'react';

import { CUSTOM_RANGE_START, todayInBusinessTz } from '../utils/businessDate';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const dateInput =
  'h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#e8793f] focus:ring-2 focus:ring-[#e8793f]/20';

function PeriodFilter({ filter, onChange }) {
  // A custom range opens on 1 April 2026 to today, so choosing "Custom Range" shows data straight away.
  const [from, setFrom] = useState(filter.from || CUSTOM_RANGE_START);
  const [to, setTo] = useState(() => filter.to || todayInBusinessTz());

  const canApply = from && to && from <= to;

  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <div className="flex flex-wrap gap-2">
        {RANGES.map(({ value, label }) => {
          const active = filter.range === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => (value === 'custom' ? onChange({ range: 'custom', from, to }) : onChange({ range: value }))}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-gradient-to-r from-[#ee7b3e] via-[#b04a4f] to-[#5b2650] text-white'
                  : 'bg-[#fde6d6]/60 text-[#9a4a3a] hover:bg-[#fde6d6]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filter.range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className={dateInput}
          />
          <span className="text-sm text-[#5b627a]">to</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={todayInBusinessTz()}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className={dateInput}
          />
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onChange({ range: 'custom', from, to })}
            className="h-9 cursor-pointer rounded-lg bg-[#14213d] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default PeriodFilter;
