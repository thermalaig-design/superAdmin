import { formatDateRange } from '../../../utils/formatDate';

const NAMES = { '7d': 'Last 7 Days', '30d': 'Last 30 Days' };

/** Graph title that follows the selected period, e.g. "Activity · Last 24 Hours" or "Activity · Last 30 Days". */
export function periodTitle(prefix, filter, period) {
  if (filter.range === '24h') return `${prefix} · Last 24 Hours`;
  if (filter.range === 'custom') return `${prefix} · ${formatDateRange(period?.from, period?.to)}`;
  return `${prefix} · ${NAMES[filter.range]}`;
}
