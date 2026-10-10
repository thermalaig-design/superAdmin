/** Columns of the trust table that can be sorted, and the direction a first click sorts in. */
export const SORT_COLUMNS = {
  createdAt: { type: 'date', firstDirection: 'desc' },
  appType: { type: 'text', firstDirection: 'asc' },
  activityNumber: { type: 'number', firstDirection: 'desc' },
  lastActivityAt: { type: 'date', firstDirection: 'desc' },
  uniqueMemberLogins: { type: 'number', firstDirection: 'desc' },
  lastMemberLoginAt: { type: 'date', firstDirection: 'desc' },
};

const isEmpty = (value) => value === null || value === undefined || value === '';

function compareValues(type, a, b) {
  if (type === 'text') return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
  if (type === 'date') return new Date(a) - new Date(b);
  return a - b;
}

/**
 * Sorts trusts by one column. Trusts with no value for that column (no activity yet, no app type, …)
 * always go to the end, whichever direction is chosen. Ties fall back to newest-created first.
 */
export function sortTrusts(trusts, { key, dir }) {
  const { type } = SORT_COLUMNS[key];
  const sign = dir === 'asc' ? 1 : -1;

  return [...trusts].sort((a, b) => {
    const aEmpty = isEmpty(a[key]);
    const bEmpty = isEmpty(b[key]);
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    const byColumn = aEmpty ? 0 : sign * compareValues(type, a[key], b[key]);
    return byColumn || new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/** Next sort state when a column header is clicked: same column flips direction, a new column starts fresh. */
export function nextSort(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: SORT_COLUMNS[key].firstDirection };
}
