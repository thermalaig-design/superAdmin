import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ScrollTable from '../../../../components/ScrollTable';
import { formatTimestamp } from '../../utils/chart';

const PAGE_SIZE = 15;

const th = 'px-4 py-3 text-left text-sm font-semibold text-(--c-text-3)';

const ACTION_STYLES = {
  login: 'bg-(--c-good-bg) text-(--c-good-text)',
  logout: 'bg-gray-100 text-(--c-text-2)',
  autologout: 'bg-(--c-warn-bg) text-(--c-warn-text)',
};

const ACTION_LABELS = { login: 'Login', logout: 'Logout', autologout: 'Auto logout' };

const ACTION_PERIODS = [
  { value: 'today', label: 'Last 24 Hours' }, // key 'today' is what the server sends; it counts the last 24 hours
  { value: 'yesterday', label: 'Previous 24 Hours' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

const pagerButton =
  'cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-(--c-text-2) hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

function ActionPill({ type }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ACTION_STYLES[type] ?? ACTION_STYLES.logout}`}>
      {ACTION_LABELS[type] ?? type}
    </span>
  );
}

function MemberLoginsTable({ members, loading }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionPeriod, setActionPeriod] = useState('today');

  const periodLabel = ACTION_PERIODS.find((p) => p.value === actionPeriod).label;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (m) => m.name?.toLowerCase().includes(query) || m.mobile?.includes(query)
    );
  }, [members, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold">Members Who Logged In</h2>
          {!loading && (
            <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">
              {members.length}
            </span>
          )}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or mobile"
          aria-label="Search members"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-(--c-accent) focus:ring-2 focus:ring-(--c-accent)/20 sm:w-60"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-(--c-text-3)">Total Actions for</span>
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          {ACTION_PERIODS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActionPeriod(value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition ${
                actionPeriod === value ? 'bg-(--c-text) text-white' : 'text-(--c-text-3) hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-200 px-4 py-12 text-center text-sm text-(--c-text-3)">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : search ? (
            'No members match your search.'
          ) : (
            'No members have logged in to this trust yet.'
          )}
        </div>
      ) : (
        <>
          <ScrollTable className="mt-4">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-(--c-page)">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Mobile No</th>
                  <th className={th}>App Platform</th>
                  <th className={th}>Number of Trusts</th>
                  <th className={th}>Action Type</th>
                  <th className={th}>Action Time</th>
                  <th className={th}>Total Actions · {periodLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((member) => (
                  <tr key={member.memberId}>
                    <td className="px-4 py-3 font-semibold">
                      {member.name || <span className="font-normal text-(--c-faint)">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-(--c-text-2)">{member.mobile || '—'}</td>
                    <td className="px-4 py-3 capitalize text-(--c-text-2)">{member.appPlatform || '—'}</td>
                    <td className="px-4 py-3">
                      {member.trustCount > 0 ? (
                        <Link
                          to={`/member-insights/${member.memberId}/trusts`}
                          state={{ backLabel: 'Unique Member Logins', section: '/organization-insights' }}
                          title="View all trusts"
                          className="inline-block min-w-8 rounded-lg bg-(--c-accent-soft) px-2.5 py-1 text-center font-semibold tabular-nums text-(--c-link) hover:underline"
                        >
                          {member.trustCount}
                        </Link>
                      ) : (
                        <span className="text-(--c-faint)">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActionPill type={member.actionType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-(--c-text-2)">{formatTimestamp(member.actionAt)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{member.actions?.[actionPeriod] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        </>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-xs text-(--c-text-3)">
          <span className="tabular-nums">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className={pagerButton} disabled={current === 1} onClick={() => setPage(current - 1)}>
              Previous
            </button>
            <button type="button" className={pagerButton} disabled={current === pageCount} onClick={() => setPage(current + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default MemberLoginsTable;
