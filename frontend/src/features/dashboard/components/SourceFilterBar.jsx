import { SOURCES } from '../utils/sources';
import SourceIcon from './SourceIcon';

const ALL_COLOR = 'var(--c-grad-via)';
const number = (value) => value.toLocaleString('en-IN');

/** Letter tile: the source colour, or white with a coloured letter when its pill is selected. */
function Tile({ sourceKey, letter, color, active }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6rem] font-bold transition-colors duration-200"
      style={active ? { background: '#fff', color } : { background: color, color: '#fff' }}
      aria-hidden="true"
    >
      <SourceIcon sourceKey={sourceKey} letter={letter} className="h-3.5 w-3.5" />
    </span>
  );
}

/**
 * One row of pills: All, then each source. `value` is a source key or null for all. A selected pill fills with its own
 * source colour; `counts` ({ [key]: leads, all: total }) shows how many leads each source has in the period.
 */
function SourceFilterBar({ value, onChange, counts }) {
  const options = [{ key: null, short: 'All', letter: 'All', color: ALL_COLOR }, ...SOURCES];

  return (
    <div className="flex w-full max-w-full gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]" role="group" aria-label="Filter by lead source">
      {options.map((option) => {
        const active = value === option.key;
        const count = counts?.[option.key ?? 'all'];
        return (
          <button
            key={option.key ?? 'all'}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            style={
              active
                ? {
                    background: `linear-gradient(135deg, ${option.color}, color-mix(in srgb, ${option.color} 70%, #000))`,
                    boxShadow: `0 8px 18px color-mix(in srgb, ${option.color} 40%, transparent)`,
                  }
                : undefined
            }
            className={`flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 text-xs font-semibold transition-all duration-200 ${
              active ? 'text-white' : 'text-(--c-text-2) hover:bg-(--c-accent-soft)'
            }`}
          >
            <Tile sourceKey={option.key} letter={option.letter} color={option.color} active={active} />
            <span className="min-w-0 truncate">{option.short}</span>
            {count != null && (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums ${active ? 'bg-white/25 text-white' : 'bg-(--c-band) text-(--c-muted)'}`}>
                {number(count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SourceFilterBar;
