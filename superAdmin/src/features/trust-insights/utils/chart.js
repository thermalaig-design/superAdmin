/** Rounds a chart's max up to a tidy number so gridlines read cleanly. */
export function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

export const yTicks = (max) => [max, (max * 3) / 4, max / 2, max / 4, 0].map(Math.round);

/** 'YYYY-MM-DD' -> '08 Oct' */
export const formatDayKey = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

/** 0-23 -> '12 AM', '3 PM' */
export const formatHour = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;

/** ISO instant -> '2026-10-08 16:26:35' in the viewer's timezone */
export const formatTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('sv-SE');
};

export const MODULE_COLORS = ['#5b2650', '#e8793f', '#7a4a8c', '#f59a2f', '#0ea5b7', '#1f8a3b', '#b04a4f', '#6b7188'];
