import { formatDateRange } from '../../utils/formatDate';
import PeriodFilter from '../PeriodFilter';

const select =
  'mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#e8793f] focus:ring-2 focus:ring-[#e8793f]/20';

function ActivityFilters({ filter, options, period, onChange, onReset, canReset }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-start">
        <label className="block text-sm font-semibold">
          User
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
        </label>

        <div>
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
          className="mt-0 h-10 cursor-pointer rounded-lg border border-gray-300 px-4 text-sm font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 lg:mt-[1.4rem]"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default ActivityFilters;
