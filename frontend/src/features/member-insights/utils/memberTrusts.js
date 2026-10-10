/** Sort keys for the trust list, and which way each sorts the first time it is clicked. */
export const FIRST_DIRECTION = {
  name: 'asc',
  role: 'asc',
  membershipNumber: 'asc',
  joinedDate: 'desc',
  isActive: 'desc',
  lastActivityAt: 'desc',
  registeredAt: 'desc',
};

const isEmpty = (value) => value === null || value === undefined || value === '';

function compare(key, a, b) {
  if (key === 'isActive') return Number(a) - Number(b);
  if (key === 'joinedDate' || key === 'registeredAt' || key === 'lastActivityAt') return new Date(a) - new Date(b);
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/** Sorts the member's trusts by one column; trusts with no value for it always come last. */
export function sortMemberTrusts(trusts, { key, dir }) {
  const sign = dir === 'asc' ? 1 : -1;

  return [...trusts].sort((a, b) => {
    const aEmpty = isEmpty(a[key]);
    const bEmpty = isEmpty(b[key]);
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    const byColumn = aEmpty ? 0 : sign * compare(key, a[key], b[key]);
    return byColumn || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/** Trusts matching a search for part of the trust name, role or membership number. */
export function searchMemberTrusts(trusts, query) {
  const text = query.trim().toLowerCase();
  if (!text) return trusts;

  return trusts.filter((t) =>
    [t.name, t.role, t.membershipNumber, t.appType].some((value) => value?.toLowerCase().includes(text))
  );
}

/** '2025-06-05' -> '05 Jun 2025' (a date with no time, so no timezone shifting). */
export function formatJoinedDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
