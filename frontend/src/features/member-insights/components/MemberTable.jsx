import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import Avatar from '../../../components/Avatar';
import SortableTh, { HeadCell } from '../../../components/SortableTh';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { formatDateTime } from '../../../utils/formatDate';

const COLUMNS = 7;

const Empty = () => <span className="text-[#9aa0b4]">—</span>;

/**
 * One page of members. Searching, sorting and paging happen on the server and are decided by the parent.
 * `pinned` is true once the panel holding this table has stuck below the header: only then do the rows scroll
 * inside the box, so before that the mouse wheel moves the page and brings the table into place.
 */
function MemberTable({ members, loading, sort, onSort, filtered, pinned = false, scrollResetKey }) {
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
      className={`scrollbar-none max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-gray-200 transition-opacity lg:max-h-none lg:min-h-0 lg:flex-1 ${
        pinned ? 'lg:overflow-y-auto' : 'lg:overflow-y-hidden'
      } ${loading && members.length > 0 ? 'opacity-60' : ''}`}
    >
      <table className="w-full min-w-[1250px] text-sm">
        <thead>
          <tr>
            <SortableTh label="Created At" sortKey="createdAt" sort={sort} onSort={onSort} />
            <SortableTh label="Member" sortKey="name" sort={sort} onSort={onSort} />
            <SortableTh label="Mobile" sortKey="mobile" sort={sort} onSort={onSort} />
            <HeadCell>Number of Trusts</HeadCell>
            <SortableTh label="Email" sortKey="email" sort={sort} onSort={onSort} />
            <SortableTh label="Company" sortKey="company" sort={sort} onSort={onSort} />
            <SortableTh label="App" sortKey="appDownloaded" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && members.length === 0 &&
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>
                <td colSpan={COLUMNS} className="px-4 py-3.5">
                  <div className="h-5 animate-pulse rounded bg-gray-100" />
                </td>
              </tr>
            ))}

          {!loading && members.length === 0 && (
            <tr>
              <td colSpan={COLUMNS} className="px-4 py-12 text-center text-[#5b627a]">
                {filtered ? 'No members match your filters.' : 'No members joined in this period.'}
              </td>
            </tr>
          )}

          {members.map((member) => (
            <tr key={member.id}>
              <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{formatDateTime(member.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name ?? '#'} />
                  {member.name ? (
                    <span className="font-semibold">{member.name}</span>
                  ) : (
                    <span className="font-normal text-[#9aa0b4]">Unnamed member</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums text-[#3a3f55]">{member.mobile ?? <Empty />}</td>
              <td className="px-4 py-3">
                {member.trustCount > 0 ? (
                  <Link
                    to={`/member-insights/${member.id}/trusts`}
                    title="View all trusts"
                    className="inline-block min-w-8 rounded-lg bg-[#fde6d6] px-2.5 py-1 text-center font-semibold tabular-nums text-[#b04a4f] hover:underline"
                  >
                    {member.trustCount}
                  </Link>
                ) : (
                  <span className="text-[#9aa0b4]">0</span>
                )}
              </td>
              <td className="px-4 py-3 text-[#3a3f55]">{member.email ?? <Empty />}</td>
              <td className="px-4 py-3 text-[#3a3f55]">{member.companyName ?? <Empty />}</td>
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    member.appDownloaded ? 'bg-[#dff3e5] text-[#1f6b34]' : 'bg-gray-100 text-[#5b627a]'
                  }`}
                >
                  {member.appDownloaded ? 'Downloaded' : 'Not yet'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MemberTable;
