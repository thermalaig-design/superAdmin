/** White card with a title; `action` (optional) sits at the right of the title row, e.g. a "View details" link. */
function ChartCard({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyChart({ loading }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-[#6b7188]">
      {loading ? <div className="h-full w-full animate-pulse rounded-xl bg-gray-50" /> : 'No activity in this range'}
    </div>
  );
}

export default ChartCard;
