import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import Avatar from '../../../components/Avatar';
import SortableTh, { HeadCell } from '../../../components/SortableTh';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { formatDateTime } from '../../../utils/formatDate';
import { formatTimestamp } from '../utils/chart';

const COLUMNS = 9;

/** Link to a trust's activity page, carrying the selected date range along. */
function activityLink(trustId, filter) {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.range === 'custom') {
    params.set('from', filter.from);
    params.set('to', filter.to);
  }
  return `/trust-insights/${trustId}?${params}`;
}

/**
 * One page of trusts. Searching, sorting and paging are decided by the parent.
 * `pinned` is true once the panel holding this table has stuck to the top of the screen: only then do the
 * rows scroll inside the box, so before that the mouse wheel moves the page and brings the table into place.
 */
function TrustTable({ trusts, loading, filter, sort, onSort, searching = false, pinned = false, scrollResetKey }) {
  const scrollRef = useDragScroll();

  // A new page / sort / search shows its first rows, not wherever the previous rows were scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollRef, scrollResetKey]);

  return (
    // The header stays fixed inside the box. Scrollbars are hidden, so a mouse can also drag the table
    // to pan it; wheel, trackpad and touch work as usual.
    <div
      ref={scrollRef}
      className={`scrollbar-none max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-gray-200 lg:max-h-none lg:min-h-0 lg:flex-1 ${
        pinned ? 'lg:overflow-y-auto' : 'lg:overflow-y-hidden'
      }`}
    >
      <table className="w-full min-w-[1500px] text-sm">
        <thead>
          <tr>
            <SortableTh label="Created At" sortKey="createdAt" sort={sort} onSort={onSort} />
            <HeadCell>Trust</HeadCell>
            <SortableTh label="App Type" sortKey="appType" sort={sort} onSort={onSort} />
            <HeadCell>Super User</HeadCell>
            <HeadCell>Super User Number</HeadCell>
            <SortableTh label="User Activity" sortKey="activityNumber" sort={sort} onSort={onSort} />
            <SortableTh label="Last Activity" sortKey="lastActivityAt" sort={sort} onSort={onSort} />
            <SortableTh label="Unique Member Logins" sortKey="uniqueMemberLogins" sort={sort} onSort={onSort} />
            <SortableTh label="Last Member Login" sortKey="lastMemberLoginAt" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && trusts.length === 0 &&
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td colSpan={COLUMNS} className="px-4 py-3.5">
                  <div className="h-5 animate-pulse rounded bg-gray-100" />
                </td>
              </tr>
            ))}

          {!loading && trusts.length === 0 && (
            <tr>
              <td colSpan={COLUMNS} className="px-4 py-12 text-center text-[#5b627a]">
                {searching ? 'No trusts match your search.' : 'No trusts were created in this period.'}
              </td>
            </tr>
          )}

          {trusts.map((trust) => (
            <tr key={trust.id}>
              <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{formatDateTime(trust.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={trust.name} logoUrl={trust.logoUrl} />
                  <Link to={activityLink(trust.id, filter)} className="font-semibold hover:text-[#b04a4f] hover:underline">
                    {trust.name}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3">
                {trust.appType ? (
                  <span className="whitespace-nowrap rounded-full bg-[#fde6d6]/70 px-2.5 py-1 text-xs font-medium text-[#9a4a3a]">
                    {trust.appType}
                  </span>
                ) : (
                  <span className="text-[#9aa0b4]">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{trust.superUserName || '—'}</td>
              <td className="px-4 py-3 tabular-nums text-[#3a3f55]">{trust.superUserNumber || '—'}</td>
              <td className="px-4 py-3 tabular-nums">
                <Link to={activityLink(trust.id, filter)} className="font-medium text-[#b04a4f] hover:underline">
                  {trust.activityNumber ?? 0}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#3a3f55]">
                {trust.lastActivityAt ? formatTimestamp(trust.lastActivityAt) : <span className="text-[#9aa0b4]">No activity yet</span>}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {trust.uniqueMemberLogins > 0 ? (
                  <Link
                    to={`/trust-insights/${trust.id}/members`}
                    className="font-medium text-[#b04a4f] hover:underline"
                    title="View members who logged in"
                  >
                    {trust.uniqueMemberLogins}
                  </Link>
                ) : (
                  <span className="text-[#3a3f55]">0</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#3a3f55]">
                {trust.lastMemberLoginAt ? formatTimestamp(trust.lastMemberLoginAt) : <span className="text-[#9aa0b4]">No logins yet</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TrustTable;
