import { useMemo, useRef, useState } from 'react';

import AreaChart from '../../../components/AreaChart';
import OverviewPanel from '../../../components/OverviewPanel';
import Pagination from '../../../components/Pagination';
import PeriodFilter from '../../../components/PeriodFilter';
import StatsGrid from '../../../components/StatsGrid';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { usePinned } from '../../../hooks/usePinned';
import { formatDateRange, formatDateTime } from '../../../utils/formatDate';
import { periodTitle } from '../../trust-insights/utils/periodTitle';
import { buildCountSeries } from '../../trust-insights/utils/trustSeries';
import MemberFilters from '../components/MemberFilters';
import MemberTable from '../components/MemberTable';
import { useMemberGrowth } from '../hooks/useMemberGrowth';
import { useMemberList } from '../hooks/useMemberList';
import { useMemberSummary } from '../hooks/useMemberSummary';

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const PIN_OFFSET = 88; // px = 4rem header + 1.5rem gap; matches the panel's lg:top-[5.5rem]

const DEFAULT_SORT = { key: 'createdAt', dir: 'desc' }; // newest first
const DEFAULT_VIEW = { search: '', trust: '', appDownload: 'all', sort: DEFAULT_SORT, page: 1, pageSize: 25 };

// Which way a column sorts the first time it is clicked.
const FIRST_DIRECTION = { createdAt: 'desc', appDownloaded: 'desc', name: 'asc', mobile: 'asc', email: 'asc', company: 'asc' };

const number = (n) => (n == null ? undefined : n.toLocaleString('en-IN'));

function MemberInsightsPage() {
  const [period, setPeriod] = useState({ range: '7d' });
  const [view, setView] = useState(DEFAULT_VIEW);
  const debouncedSearch = useDebouncedValue(view.search);

  const { summary, trusts, error: summaryError, ready } = useMemberSummary();
  const growth = useMemberGrowth(period);
  const { data, loading, error } = useMemberList({
    page: view.page,
    pageSize: view.pageSize,
    sortBy: view.sort.key,
    sort: view.sort.dir,
    search: debouncedSearch.trim(),
    trust: view.trust,
    appDownload: view.appDownload,
    ...period,
  });

  // Any change to the table's filters, sort or period goes back to page 1.
  const update = (patch) => setView((prev) => ({ ...prev, page: 1, ...patch }));
  const changePeriod = (next) => {
    setPeriod(next);
    setView((prev) => ({ ...prev, page: 1 }));
  };
  const changeSort = (key) =>
    update({
      sort: view.sort.key === key ? { key, dir: view.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIRECTION[key] },
    });

  const filtered = view.search.trim() !== '' || view.trust !== '' || view.appDownload !== 'all';
  const canReset =
    filtered ||
    view.sort.key !== DEFAULT_SORT.key ||
    view.sort.dir !== DEFAULT_SORT.dir ||
    view.pageSize !== DEFAULT_VIEW.pageSize;

  // The graph shows the whole period; the table's search and filters only narrow the list below it.
  const series = useMemo(
    () => buildCountSeries(growth.data ?? { counts: [], granularity: 'day' }, growth.data?.period, growth.loadedAt),
    [growth.data, growth.loadedAt]
  );

  const downloadedPercent = summary?.totalMembers ? Math.round((summary.appDownloaded / summary.totalMembers) * 100) : 0;
  const [lastDate, lastTime] = summary?.lastJoined ? formatDateTime(summary.lastJoined.createdAt).split(', ') : [];

  const stats = [
    { marker: '#7a4a8c', label: 'Total Members', value: number(summary?.totalMembers), hint: 'Across all trusts' },
    { marker: '#1f8a3b', label: 'App Downloaded', value: number(summary?.appDownloaded), hint: `${downloadedPercent}% of all members` },
    {
      marker: '#e8912f',
      label: 'Joined in Period',
      value: number(growth.data?.total),
      hint: growth.data ? formatDateRange(growth.data.period.from, growth.data.period.to) : undefined,
    },
    {
      marker: '#2a8fa3',
      label: 'Last Member Joined',
      value: lastDate ?? '—',
      hint: summary?.lastJoined ? `${lastTime} · ${summary.lastJoined.trustName ?? 'Unknown trust'}` : undefined,
    },
  ];

  // The table panel scrolls with the page until it reaches the top, then pins there and its rows scroll.
  const panelRef = useRef(null);
  const pinned = usePinned(panelRef, PIN_OFFSET);

  const anyError = error || summaryError || growth.error;

  return (
    <div className="mx-auto max-w-7xl">
      {anyError && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {anyError}
        </p>
      )}

      {/* Date selector on top, then one panel: the headline numbers next to the members-joined graph. */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="text-lg font-semibold">Member Overview</h2>
        <PeriodFilter filter={period} onChange={changePeriod} />
      </div>

      <OverviewPanel
        className="mt-4"
        storageKey="overview-collapsed:members"
        summary={summary && growth.data && `Total members ${number(summary.totalMembers)} · Joined in period ${number(growth.data.total)}`}
        stats={<StatsGrid stats={stats} loading={!ready || !growth.data} />}
        chart={
          <AreaChart
            title={periodTitle('Members Joined', period, growth.data?.period)}
            series={series}
            loading={growth.loading}
            noun="member"
            emptyText="No members joined in this period"
          />
        }
      />

      {/* On large screens this panel sticks below the header and is exactly one screen tall. */}
      <section
        ref={panelRef}
        className={`${panel} mt-5 flex flex-col lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-8rem)] lg:min-h-[420px]`}
      >
        <div className="mb-4 flex shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold">Members Joined in Selected Period</h2>
            {data && (
              <span className="rounded-full bg-[#fde6d6] px-2.5 py-0.5 text-xs font-semibold text-[#b04a4f]">
                {filtered ? `${number(data.total)} found` : number(data.total)}
              </span>
            )}
          </div>

          <MemberFilters
            search={view.search}
            onSearchChange={(search) => update({ search })}
            trust={view.trust}
            onTrustChange={(trust) => update({ trust })}
            trusts={trusts}
            appDownload={view.appDownload}
            onAppDownloadChange={(appDownload) => update({ appDownload })}
            onReset={() => setView(DEFAULT_VIEW)}
            canReset={canReset}
          />
        </div>

        <MemberTable
          members={data?.members ?? []}
          loading={loading}
          sort={view.sort}
          onSort={changeSort}
          filtered={filtered}
          pinned={pinned}
          scrollResetKey={[view.page, view.pageSize, view.sort.key, view.sort.dir, debouncedSearch, view.trust, view.appDownload, period.range, period.from, period.to].join('|')}
        />

        <Pagination
          page={view.page}
          pageSize={view.pageSize}
          total={data?.total ?? 0}
          loading={loading}
          onPageChange={(page) => setView((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => update({ pageSize })}
        />
      </section>
    </div>
  );
}

export default MemberInsightsPage;
