import { useMemo, useRef, useState } from 'react';

import AreaChart from '../../../components/AreaChart';
import OverviewPanel from '../../../components/OverviewPanel';
import Pagination from '../../../components/Pagination';
import SearchInput from '../../../components/SearchInput';
import { usePinned } from '../../../hooks/usePinned';
import OverviewStats from '../components/overview/OverviewStats';
import PeriodFilter from '../../../components/PeriodFilter';
import TrustTable from '../components/TrustTable';
import { useTrustInsights } from '../hooks/useTrustInsights';
import { searchTrusts } from '../utils/searchTrusts';
import { periodTitle } from '../utils/periodTitle';
import { nextSort, sortTrusts } from '../utils/sortTrusts';
import { buildCreationSeries } from '../utils/trustSeries';

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const DEFAULT_SORT = { key: 'createdAt', dir: 'desc' }; // newest first, as the server sends them
const DEFAULT_PAGE_SIZE = 25;
const PIN_OFFSET = 88; // px = 4rem header + 1.5rem gap; matches the panel's lg:top-[5.5rem]

function TrustInsightsPage() {
  const [filter, setFilter] = useState({ range: '7d' });
  const { data, loadedAt, loading, error } = useTrustInsights(filter);

  // The graph always covers the whole selected period; the search box only narrows the table below it.
  const series = useMemo(() => buildCreationSeries(data?.trusts ?? [], data?.period, loadedAt), [data, loadedAt]);

  // Everything for the chosen period is already loaded, so searching, sorting and paging happen here.
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const searching = search !== '';
  const matches = useMemo(() => sortTrusts(searchTrusts(data?.trusts ?? [], search), sort), [data, search, sort]);

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changePeriod = (next) => {
    setFilter(next);
    setPage(1);
  };
  const changeSearch = (text) => {
    setSearch(text);
    setPage(1);
  };
  const changeSort = (key) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };
  const changePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // Reset puts the table back to its starting view (no search, newest first, 25 rows). The date period stays.
  const canReset = searching || sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir || pageSize !== DEFAULT_PAGE_SIZE;
  const resetTable = () => {
    setSearch('');
    setSort(DEFAULT_SORT);
    setPageSize(DEFAULT_PAGE_SIZE);
    setPage(1);
  };

  // The table panel scrolls with the page until it reaches the top, then pins there and its rows scroll.
  const panelRef = useRef(null);
  const pinned = usePinned(panelRef, PIN_OFFSET);

  const initialLoad = loading && !data;

  return (
    <div className="mx-auto max-w-7xl">
      {/* <h1 className="text-3xl font-bold tracking-tight">Trust Insights</h1> */}
     

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Date selector on top, then one card: the headline numbers next to the creation graph. */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trust Creation Overview</h2>
          {/* <p className="mt-1 text-sm text-[#5b627a]">All trusts on the platform · based on creation date</p> */}
        </div>
        <PeriodFilter filter={filter} onChange={changePeriod} />
      </div>

      <OverviewPanel
        className="mt-4"
        storageKey="overview-collapsed:organization"
        summary={data && `Total trusts ${data.totalTrusts.toLocaleString('en-IN')} · Selected period ${data.period.count.toLocaleString('en-IN')}`}
        stats={<OverviewStats data={data} loading={initialLoad} />}
        chart={
          <AreaChart
            title={periodTitle('Trusts Created', filter, data?.period)}
            series={series}
            loading={loading}
            noun="trust"
            emptyText="No trusts created in this period"
          />
        }
      />

      {/* On large screens this panel sticks below the header and is exactly one screen tall. */}
      <section
        ref={panelRef}
        className={`${panel} mt-5 flex flex-col lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-8rem)] lg:min-h-[420px]`}
      >
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold">Trusts Created in Selected Period</h2>
            {data && (
              <span className="rounded-full bg-[#fde6d6] px-2.5 py-0.5 text-xs font-semibold text-[#b04a4f]">
                {searching ? `${matches.length} of ${data.period.count}` : data.period.count}
              </span>
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-80 sm:flex-none">
              <SearchInput
                value={search}
                onChange={changeSearch}
                placeholder="Search trust, super user or number"
                label="Search trusts"
              />
            </div>
            <button
              type="button"
              onClick={resetTable}
              disabled={!canReset}
              className="h-10 shrink-0 cursor-pointer rounded-xl border border-gray-300 px-4 text-sm font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        <TrustTable
          trusts={pageRows}
          loading={loading}
          filter={filter}
          sort={sort}
          onSort={changeSort}
          searching={searching}
          pinned={pinned}
          scrollResetKey={`${currentPage}|${pageSize}|${sort.key}|${sort.dir}|${search}|${filter.range}`}
        />

        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={matches.length}
          loading={loading}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      </section>
    </div>
  );
}

export default TrustInsightsPage;
