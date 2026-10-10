import StatsGrid from '../../../../components/StatsGrid';
import { formatDateRange, formatDateTime } from '../../../../utils/formatDate';

/** The four trust-creation numbers for the Organization Insights overview. */
function OverviewStats({ data, loading }) {
  // "10 Oct 2026, 12:26 pm": the date is the headline and the time goes in the hint.
  const lastTrust = data?.lastTrust;
  const [lastDate, lastTime] = lastTrust ? formatDateTime(lastTrust.createdAt).split(', ') : [];

  const stats = [
    { marker: '#7a4a8c', label: 'Total Trusts', value: data?.totalTrusts?.toLocaleString('en-IN'), hint: 'All trusts created' },
    { marker: '#1f8a3b', label: 'Created Today', value: data?.createdToday?.toLocaleString('en-IN'), hint: 'Since midnight' },
    {
      marker: '#e8912f',
      label: 'Selected Period',
      value: data?.period.count.toLocaleString('en-IN'),
      hint: formatDateRange(data?.period.from, data?.period.to),
    },
    {
      marker: '#2a8fa3',
      label: 'Last Trust Created',
      value: lastDate ?? '—',
      hint: lastTrust ? `${lastTime} · ${lastTrust.name}` : undefined,
    },
  ];

  return <StatsGrid stats={stats} loading={loading} />;
}

export default OverviewStats;
