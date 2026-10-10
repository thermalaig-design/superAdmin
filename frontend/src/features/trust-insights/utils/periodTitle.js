import { formatDateRange } from '../../../utils/formatDate';

const NAMES = { '7d': 'Last 7 Days', '30d': 'Last 30 Days' };

/** Graph title that follows the selected period, e.g. "Activity Today" or "Activity · Last 30 Days". */
export function periodTitle(prefix, filter, period) {
  if (filter.range === 'today') return `${prefix} Today`;
  if (filter.range === 'custom') return `${prefix} · ${formatDateRange(period?.from, period?.to)}`;
  return `${prefix} · ${NAMES[filter.range]}`;
}
