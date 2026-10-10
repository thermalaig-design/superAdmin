import { formatDateRange } from '../../../../utils/formatDate';
import PeriodFilter from '../../../../components/PeriodFilter';

const select =
  'mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#e8793f] focus:ring-2 focus:ring-[#e8793f]/20';

/** `trusts` ([{ id, name, isActive }]) swaps the User select for a Trust select (used on a member's activity page). */
function ActivityFilters({ filter, options, period, onChange, onReset, canReset, trusts }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      {/* One row of four only when there is room (≥ xl). Below that: date range on its own row, the two selects side by side. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_auto_1fr_auto] xl:items-start">
        <label className="block text-sm font-semibold">
          {trusts ? 'Trust' : 'User'}
          {trusts ? (
            <select
              className={`${select} font-normal`}
              value={filter.trust}
              onChange={(e) => onChange({ trust: e.target.value })}
            >
              <option value="all">All trusts</option>
              {trusts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isActive ? t.name : `${t.name} (inactive)`}
                </option>
              ))}
            </select>
          ) : (
            <select
              className={`${select} font-normal`}
              value={filter.user ?? ''}
              onChange={(e) => onChange({ user: e.target.value || undefined })}
            >
              <option value="">All users</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <div className="sm:order-first sm:col-span-2 xl:order-none xl:col-span-1">
          <p className="text-sm font-semibold">Date Range</p>
          <div className="mt-1.5">
            <PeriodFilter filter={filter} onChange={onChange} />
          </div>
          <p className="mt-1.5 text-xs text-[#6b7188]">{period ? formatDateRange(period.from, period.to) : ''}</p>
        </div>

        <label className="block text-sm font-semibold">
          Module / Page
          <select
            className={`${select} font-normal`}
            value={filter.target ?? ''}
            onChange={(e) => onChange({ target: e.target.value || undefined })}
          >
            <option value="">All Modules</option>
            <optgroup label="Modules">
              {options.modules.map((m) => (
                <option key={m} value={`module:${m}`}>
                  {m}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pages">
              {options.pages.map((p) => (
                <option key={p.id} value={`page:${p.id}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <button
          type="button"
          onClick={onReset}
          disabled={!canReset}
          className="h-10 cursor-pointer rounded-lg border border-gray-300 px-4 text-sm font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 sm:justify-self-end xl:col-span-1 xl:mt-[1.4rem] xl:justify-self-auto"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default ActivityFilters;
