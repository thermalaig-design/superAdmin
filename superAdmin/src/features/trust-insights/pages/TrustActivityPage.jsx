import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import ActivityFilters from '../components/activity/ActivityFilters';
import HourChart from '../components/activity/HourChart';
import ModulesDonut from '../components/activity/ModulesDonut';
import RecentActivityTable from '../components/activity/RecentActivityTable';
import RoutesChart from '../components/activity/RoutesChart';
import TrendChart from '../components/activity/TrendChart';
import StatCard from '../components/StatCard';
import { useTrustActivity } from '../hooks/useTrustActivity';

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

  const { data, loading, error } = useTrustActivity(trustId, filter);

  const initialLoad = loading && !data;
  const summary = data?.summary;
  const canReset =
    Boolean(filter.user || filter.target) ||
    filter.range !== initial.range ||
    filter.from !== initial.from ||
    filter.to !== initial.to;

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/trust-insights" className="text-sm font-medium text-[#b04a4f] hover:underline">
        ← Back to Trust Insights
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">User Activity</h1>
      <p className="mt-1 text-[#5b627a]">
        {data ? `${data.trust.name} · ` : ''}Page visits and usage by the trust&apos;s users.
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Activities"
            value={summary?.totalActivities}
            hint="In selected range"
            accent="border-t-[#7a4a8c]"
            loading={initialLoad}
          />
          <StatCard
            label="Active Days"
            value={summary?.activeDays}
            hint="Days with activity"
            accent="border-t-[#1f8a3b]"
            loading={initialLoad}
          />
          <StatCard
            label="Unique Pages Visited"
            value={summary?.uniquePages}
            hint="Distinct pages"
            accent="border-t-[#f59a2f]"
            loading={initialLoad}
          />
          <StatCard
            label="Avg Activities per Day"
            value={summary?.avgPerDay?.toFixed(1)}
            hint={`Over ${summary?.activeDays ?? 0} active day${summary?.activeDays === 1 ? '' : 's'}`}
            accent="border-t-[#0ea5b7]"
            loading={initialLoad}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TrendChart trend={data?.trend ?? []} loading={loading} />
          <RoutesChart routes={data?.topRoutes ?? []} loading={loading} />
          <ModulesDonut modules={data?.topModules ?? []} total={summary?.totalActivities ?? 0} loading={loading} />
          <HourChart byHour={data?.byHour ?? []} loading={loading} />
        </div>

        <RecentActivityTable rows={data?.recent ?? []} loading={loading} />
      </div>
    </div>
  );
}

export default TrustActivityPage;
