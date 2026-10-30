import { useState } from 'react';

import { CUSTOM_RANGE_START, todayInBusinessTz } from '../utils/businessDate';

const RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const dateInput =
  'h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-(--c-accent) focus:ring-2 focus:ring-(--c-accent)/20';

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
                  ? 'bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white'
                  : 'bg-(--c-accent-soft)/60 text-(--c-link) hover:bg-(--c-accent-soft)'
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
          <span className="text-sm text-(--c-text-3)">to</span>
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
            className="h-9 cursor-pointer rounded-lg bg-(--c-text) px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default PeriodFilter;
