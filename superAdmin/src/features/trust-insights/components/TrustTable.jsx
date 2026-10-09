import { Link } from 'react-router-dom';

import { useDragScroll } from '../../../hooks/useDragScroll';
import { formatTimestamp } from '../utils/chart';
import { formatDateTime } from '../utils/formatDate';
import TrustAvatar from './TrustAvatar';

// Sticky header cells: the inset shadow draws the bottom border, since real borders don't stay attached when sticky.
const th =
  'sticky top-0 z-10 whitespace-nowrap bg-[#fbf6f3] px-4 py-3 text-left text-sm font-semibold text-[#5b627a] shadow-[inset_0_-1px_0_#e5e7eb]';

/** Link to a trust's activity page, carrying the selected date range along. */
function activityLink(trustId, filter) {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.range === 'custom') {
    params.set('from', filter.from);
    params.set('to', filter.to);
  }
  return `/trust-insights/${trustId}?${params}`;
}

function TrustTable({ trusts, loading, filter }) {
  const scrollRef = useDragScroll();

  return (
    // The table scrolls inside its own box (header stays fixed). Scrollbars are hidden, so a mouse can
    // also drag the table to pan it; wheel, trackpad and touch work as usual.
    <div
      ref={scrollRef}
      className="scrollbar-none max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-gray-200 lg:max-h-none lg:min-h-0 lg:flex-1"
    >
      <table className="w-full min-w-[1500px] text-sm">
        <thead>
          <tr>
            <th className={th}>Trust</th>
            <th className={th}>App Type</th>
            <th className={th}>Super User</th>
            <th className={th}>Super User Number</th>
            <th className={th}>User Activity</th>
            <th className={th}>Last Activity</th>
            <th className={th}>Unique Member Logins</th>
            <th className={th}>Last Member Login</th>
            <th className={th}>Created At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && trusts.length === 0 &&
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                <td colSpan={9} className="px-4 py-3.5">
                  <div className="h-5 animate-pulse rounded bg-gray-100" />
                </td>
              </tr>
            ))}

          {!loading && trusts.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-[#5b627a]">
                No trusts were created in this period.
              </td>
            </tr>
          )}

          {trusts.map((trust) => (
            <tr key={trust.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <TrustAvatar name={trust.name} logoUrl={trust.logoUrl} />
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
              <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{formatDateTime(trust.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TrustTable;
