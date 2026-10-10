/** ISO instant -> '2026-10-08 16:26:35' in the viewer's timezone */
export const formatTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('sv-SE');
};

export const MODULE_COLORS = ['#5b2650', '#e8793f', '#7a4a8c', '#f59a2f', '#0ea5b7', '#1f8a3b', '#b04a4f', '#6b7188'];
