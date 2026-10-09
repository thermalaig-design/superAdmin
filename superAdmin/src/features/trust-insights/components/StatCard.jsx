function StatCard({ label, value, hint, accent, loading, compact = false }) {
  return (
    <div className={`rounded-2xl border border-gray-200 border-t-[3px] bg-white px-5 py-4 ${accent}`}>
      <p className="text-sm text-[#5b627a]">{label}</p>

      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className={`mt-1 font-bold tabular-nums tracking-tight ${compact ? 'text-xl leading-9' : 'text-3xl'}`}>
          {value}
        </p>
      )}

      <p className="mt-1 min-h-4 truncate text-xs text-[#6b7188]">{loading ? '' : hint}</p>
    </div>
  );
}

export default StatCard;
