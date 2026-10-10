import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import AreaChart from '../../../components/AreaChart';
import OverviewPanel from '../../../components/OverviewPanel';
import StatsGrid from '../../../components/StatsGrid';
import ActivityFilters from '../components/activity/ActivityFilters';
import ModulesDonut from '../components/activity/ModulesDonut';
import RecentActivityTable from '../components/activity/RecentActivityTable';
import RoutesChart from '../components/activity/RoutesChart';
import { useTrustActivity } from '../hooks/useTrustActivity';
import { periodTitle } from '../utils/periodTitle';
import { buildActivitySeries } from '../utils/trustSeries';

const NO_OPTIONS = { users: [], modules: [], pages: [] };

function TrustActivityPage() {
  const { trustId } = useParams();
  const [searchParams] = useSearchParams();

  const [initial] = useState(() => ({
    range: searchParams.get('range') || '7d',
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  }));
  const [filter, setFilter] = useState(initial);

  const { data, loadedAt, loading, error } = useTrustActivity(trustId, filter);

  const series = useMemo(
    () => buildActivitySeries({ trend: data?.trend ?? [], byHour: data?.byHour ?? [] }, data?.period, loadedAt),
    [data, loadedAt]
  );

  const initialLoad = loading && !data;
  const summary = data?.summary;
  const activeDays = summary?.activeDays ?? 0;

  const stats = [
    { marker: '#7a4a8c', label: 'Total Activities', value: summary?.totalActivities.toLocaleString('en-IN'), hint: 'In selected range' },
    { marker: '#1f8a3b', label: 'Active Days', value: summary?.activeDays.toLocaleString('en-IN'), hint: 'Days with activity' },
    { marker: '#e8912f', label: 'Unique Pages Visited', value: summary?.uniquePages.toLocaleString('en-IN'), hint: 'Distinct pages' },
    {
      marker: '#2a8fa3',
      label: 'Avg Activities per Day',
      value: summary?.avgPerDay.toFixed(1),
      hint: `Over ${activeDays} active day${activeDays === 1 ? '' : 's'}`,
    },
  ];
  const canReset =
    Boolean(filter.user || filter.target) ||
    filter.range !== initial.range ||
    filter.from !== initial.from ||
    filter.to !== initial.to;

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/organization-insights" className="text-sm font-medium text-[#b04a4f] hover:underline">
        ← Back to Trust Insights
      </Link>
      <h1 className="mt-3 text-lg lg:text-3xl font-bold tracking-tight">User Activity -{data ? `${data.trust.name} · ` : ''} </h1>
      <p className="mt-1 text-[#5b627a]">
        Page visits and usage by the trust&apos;s users.
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-5">
        <ActivityFilters
          filter={filter}
          options={data?.filters ?? NO_OPTIONS}
          period={data?.period}
          onChange={(patch) =>
            setFilter((prev) => ({
              ...prev,
              ...patch,
              // switching away from a custom range drops its dates
              ...(patch.range && patch.range !== 'custom' ? { from: undefined, to: undefined } : {}),
            }))
          }
          onReset={() => setFilter(initial)}
          canReset={canReset}
        />

        {/* Same overview as Organization Insights. The graph follows the selected duration: hourly for a day, daily, then weekly. */}
        <OverviewPanel
          storageKey="overview-collapsed:user-activity"
          summary={summary && `Total activities ${summary.totalActivities.toLocaleString('en-IN')} · ${summary.activeDays} active day${summary.activeDays === 1 ? '' : 's'}`}
          stats={<StatsGrid stats={stats} loading={initialLoad} />}
          chart={
            <AreaChart
              title={periodTitle('Activity', filter, data?.period)}
              series={series}
              loading={loading}
              noun="activity"
              nounPlural="activities"
              emptyText="No activity in this period"
            />
          }
        />

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <RoutesChart routes={data?.topRoutes ?? []} loading={loading} />
          <ModulesDonut modules={data?.topModules ?? []} total={summary?.totalActivities ?? 0} loading={loading} />
        </div>

        <RecentActivityTable rows={data?.recent ?? []} loading={loading} />
      </div>
    </div>
  );
}

export default TrustActivityPage;
