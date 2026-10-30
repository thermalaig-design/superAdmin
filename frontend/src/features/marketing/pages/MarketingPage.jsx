import { useMemo } from 'react';

import AreaChart from '../../../components/AreaChart';
import OverviewPanel from '../../../components/OverviewPanel';
import PeriodFilter from '../../../components/PeriodFilter';
import StatsGrid from '../../../components/StatsGrid';
import { useSessionState } from '../../../hooks/useSessionState';
import { formatDateRange, formatDateTime } from '../../../utils/formatDate';
import { periodTitle } from '../../trust-insights/utils/periodTitle';
import LeadBreakdown from '../components/LeadBreakdown';
import { useMarketingOverview } from '../hooks/useMarketingOverview';
import { buildLeadSeries, campaignBars, channelSlices, hourColumns, paidSlices } from '../utils/leadStats';

const number = (value) => value?.toLocaleString('en-IN');

function MarketingPage() {
  const [filter, setFilter] = useSessionState('marketing:filter', { range: '7d' });
  const { data, loadedAt, loading, error } = useMarketingOverview(filter);

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const series = useMemo(() => buildLeadSeries(leads, data?.period, loadedAt), [leads, data, loadedAt]);
  const channels = useMemo(() => channelSlices(leads), [leads]);
  const paid = useMemo(() => paidSlices(leads), [leads]);
  const campaigns = useMemo(() => campaignBars(leads), [leads]);
  const hours = useMemo(() => hourColumns(leads), [leads]);

  const initialLoad = loading && !data;

  // "13 Oct 2026, 1:13 pm": the date is the headline and the time goes in the hint.
  const lastLead = data?.lastLead;
  const [lastDate, lastTime] = lastLead ? formatDateTime(lastLead.receivedAt).split(', ') : [];
  const paidCount = paid[0].value;

  const stats = [
    { marker: 'var(--c-c2)', label: 'Total Leads', value: number(data?.totalLeads), hint: 'All leads received' },
    { marker: 'var(--c-good)', label: 'Leads (Last 24 Hours)', value: number(data?.leadsToday), hint: 'Last 24 hours' },
    {
      marker: 'var(--c-c3)',
      label: 'Selected Period',
      value: number(data?.period.count),
      hint: data && data.period.count > 0 ? `${Math.round((paidCount / data.period.count) * 100)}% from paid ads` : formatDateRange(data?.period.from, data?.period.to),
    },
    {
      marker: 'var(--c-c4)',
      label: 'Last Lead Received',
      value: lastDate ?? '—',
      hint: lastLead ? `${lastTime} · ${lastLead.source}` : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="text-lg font-semibold">Marketing Overview</h2>
        <PeriodFilter filter={filter} onChange={setFilter} />
      </div>

      <OverviewPanel
        className="mt-4"
        storageKey="overview-collapsed:marketing"
        summary={data && `Total leads ${number(data.totalLeads)} · Selected period ${number(data.period.count)}`}
        stats={<StatsGrid stats={stats} loading={initialLoad} />}
        chart={
          <AreaChart
            title={periodTitle('Leads Received', filter, data?.period)}
            series={series}
            loading={loading}
            noun="lead"
            emptyText="No leads in this period"
          />
        }
      />

      <div className="mt-5">
        <LeadBreakdown channels={channels} paid={paid} campaigns={campaigns} hours={hours} loading={loading} />
      </div>
    </div>
  );
}

export default MarketingPage;
