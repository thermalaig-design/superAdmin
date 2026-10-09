import { useState } from 'react';

import PeriodFilter from '../components/PeriodFilter';
import StatCard from '../components/StatCard';
import TrustTable from '../components/TrustTable';
import { useTrustInsights } from '../hooks/useTrustInsights';
import { formatDateRange, formatDateTime } from '../utils/formatDate';

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';

function TrustInsightsPage() {
  const [filter, setFilter] = useState({ range: '7d' });
  const { data, loading, error } = useTrustInsights(filter);

  const initialLoad = loading && !data;

  return (
    // On large screens the page fits the viewport (main has 5rem of vertical padding) so only the table scrolls.
    <div className="mx-auto max-w-7xl lg:flex lg:h-[calc(100vh-5rem)] lg:min-h-[640px] lg:flex-col">
      <h1 className="text-3xl font-bold tracking-tight">Trust Insights</h1>
      <p className="mt-1 text-[#5b627a]">
        Total trusts created and recent trust activity across the platform.
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className={`${panel} mt-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Trust Creation Overview</h2>
            <p className="mt-1 text-sm text-[#5b627a]">All trusts on the platform · based on creation date</p>
          </div>
          <PeriodFilter filter={filter} onChange={setFilter} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Trusts"
            value={data?.totalTrusts}
            hint="All trusts created"
            accent="border-t-[#7a4a8c]"
            loading={initialLoad}
          />
          <StatCard
            label="Created Today"
            value={data?.createdToday}
            hint="Since local midnight"
            accent="border-t-[#1f8a3b]"
            loading={initialLoad}
          />
          <StatCard
            label="Selected Period"
            value={data?.period.count}
            hint={formatDateRange(data?.period.from, data?.period.to)}
            accent="border-t-[#f59a2f]"
            loading={initialLoad}
          />
          <StatCard
            label="Last Trust Created"
            value={data?.lastTrust ? formatDateTime(data.lastTrust.createdAt) : '—'}
            hint={data?.lastTrust?.name}
            accent="border-t-[#0ea5b7]"
            loading={initialLoad}
            compact
          />
        </div>
      </section>

      <section className={`${panel} mt-5 flex flex-col lg:min-h-0 lg:flex-1`}>
        <div className="mb-4 flex shrink-0 items-center gap-2.5">
          <h2 className="text-base font-semibold">Trusts Created in Selected Period</h2>
          {data && (
            <span className="rounded-full bg-[#fde6d6] px-2.5 py-0.5 text-xs font-semibold text-[#b04a4f]">
              {data.period.count}
            </span>
          )}
        </div>
        <TrustTable trusts={data?.trusts ?? []} loading={loading} filter={filter} />
      </section>
    </div>
  );
}

export default TrustInsightsPage;
