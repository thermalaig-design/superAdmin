/** Small helpers for the lists behind the Platform Overview cards (formatting and column sorting). */
export const number = (value) => value.toLocaleString('en-IN');

export const when = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Compares two values of a column type ('number' | 'date' | text); empty values go last. */
export const compare = (type) => (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (type === 'number') return a - b;
  if (type === 'date') return new Date(a) - new Date(b);
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
};

/** A mobile number sorts as a number. */
export const typeOf = (column) => (column.key === 'mobile' ? 'number' : column.type);

/** The first click on a heading: biggest / newest first for numbers and dates, A to Z for text. */
export const firstDirection = (column) => (typeOf(column) === 'text' || !typeOf(column) ? 'asc' : 'desc');

/** Rows ordered by a { key, direction } sort over `columns`. */
export function sortRows(rows, columns, sort) {
  const column = columns.find((c) => c.key === sort?.key);
  if (!column) return rows;
  const by = compare(typeOf(column));
  return [...rows].sort((a, b) => (sort.direction === 'asc' ? by(a[column.key], b[column.key]) : by(b[column.key], a[column.key])));
}

/** The next sort after a click on `column`: the same heading again flips the direction. */
export const nextSort = (current, column) =>
  current?.key === column.key ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key: column.key, direction: firstDirection(column) };

/** Does this person match a search for a name or a mobile number? */
export function matchesPerson(row, needle) {
  const digits = needle.replace(/\D/g, '');
  return String(row.name ?? '').toLowerCase().includes(needle) || (digits.length > 0 && String(row.mobile ?? '').includes(digits));
}
