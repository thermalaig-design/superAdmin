const toDate = (value) => (value ? new Date(value) : null);

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const formatDay = (value) =>
  toDate(value)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) ?? '';

export const formatDateRange = (from, to) => (from && to ? `${formatDay(from)} – ${formatDay(to)}` : '');
