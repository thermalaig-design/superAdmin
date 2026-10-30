import StatsGrid from '../../../../components/StatsGrid';
import { formatDateRange, formatDateTime } from '../../../../utils/formatDate';

/** The four trust-creation numbers for the Organization Insights overview. */
function OverviewStats({ data, loading }) {
  // "10 Oct 2026, 12:26 pm": the date is the headline and the time goes in the hint.
  const lastTrust = data?.lastTrust;
  const [lastDate, lastTime] = lastTrust ? formatDateTime(lastTrust.createdAt).split(', ') : [];

  const stats = [
    { marker: 'var(--c-c2)', label: 'Total Trusts', value: data?.totalTrusts?.toLocaleString('en-IN'), hint: 'All trusts created' },
    { marker: 'var(--c-good)', label: 'Created (Last 24 Hours)', value: data?.createdToday?.toLocaleString('en-IN'), hint: 'Last 24 hours' },
    {
      marker: 'var(--c-c3)',
      label: 'Selected Period',
      value: data?.period.count.toLocaleString('en-IN'),
      hint: formatDateRange(data?.period.from, data?.period.to),
    },
    {
      marker: 'var(--c-c4)',
      label: 'Last Trust Created',
      value: lastDate ?? '—',
      hint: lastTrust ? `${lastTime} · ${lastTrust.name}` : undefined,
    },
  ];

  return <StatsGrid stats={stats} loading={loading} />;
}

export default OverviewStats;
