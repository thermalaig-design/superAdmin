// Hairlines between cells: a 2 × 2 grid normally, one row of four once the area is wide enough (≥ 42rem).
const DIVIDERS = [
  '',
  'border-l',
  'border-t @2xl:border-t-0 @2xl:border-l',
  'border-l border-t @2xl:border-t-0',
];

function Stat({ marker, label, value, hint, loading, divider }) {
  return (
    <div className={`min-w-0 border-[#e3d6cb] px-4 py-5 @md:px-6 ${divider}`}>
      <p className="flex min-h-8 items-start gap-2 text-xs font-medium uppercase leading-4 tracking-[0.08em] text-[#6b7188] @md:min-h-0">
        <span className="mt-[4px] h-2 w-2 shrink-0 rounded-[2px]" style={{ background: marker }} aria-hidden="true" />
        <span>{label}</span>
      </p>

      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-[#eadfd6]" />
      ) : (
        <p className="mt-2 truncate text-2xl font-semibold leading-9 tracking-tight tabular-nums text-[#14213d] @md:text-[1.75rem]">
          {value}
        </p>
      )}

      <p className="mt-1 truncate text-[0.8rem] text-[#7b8196]" title={loading ? undefined : hint}>
        {loading ? ' ' : hint}
      </p>
    </div>
  );
}

/**
 * Four headline numbers as a quiet, divided grid that sits directly on an overview panel.
 * `stats` is [{ marker (colour), label, value, hint }], exactly four.
 */
function StatsGrid({ stats, loading }) {
  return (
    <div className="@container flex items-center">
      <div className="grid w-full grid-cols-2 @2xl:grid-cols-4">
        {stats.map((stat, i) => (
          <Stat key={stat.label} {...stat} loading={loading} divider={DIVIDERS[i]} />
        ))}
      </div>
    </div>
  );
}

export default StatsGrid;
