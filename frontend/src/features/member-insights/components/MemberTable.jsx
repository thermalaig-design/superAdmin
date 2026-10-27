import { useEffect } from 'react';

import SortableTh, { HeadCell } from '../../../components/SortableTh';
import LoadingBar from '../../../components/LoadingBar';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { MEMBER_COLUMNS } from '../utils/memberColumns';
import { periodQuery } from '../utils/periodQuery';

/**
 * One page of members. Searching, sorting and paging happen on the server and are decided by the parent.
 * `showExtra` shows the less important columns too (see MEMBER_COLUMNS).
 * `pinned` is true once the panel holding this table has stuck below the header: only then do the rows scroll
 * inside the box, so before that the mouse wheel moves the page and brings the table into place.
 */
function MemberTable({ members, loading, sort, onSort, filtered, pinned = false, scrollResetKey, period, showExtra = false }) {
  const context = { appsQuery: periodQuery(period) };
  const columns = MEMBER_COLUMNS.filter((c) => showExtra || !c.extra);
  const scrollRef = useDragScroll();

  // A new page / sort / search shows its first rows, not wherever the previous rows were scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollRef, scrollResetKey]);

  // The header stays fixed inside the box. Scrollbars are hidden, so a mouse can also drag the table
  // to pan it; wheel, trackpad and touch work as usual.
  return (
    <>
    <LoadingBar active={loading && members.length > 0} className="fixed inset-0 z-30" />
    <div
      ref={scrollRef}
      className={`scrollbar-none max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-gray-200 transition-opacity lg:max-h-none lg:min-h-0 lg:flex-1 ${
        pinned ? 'lg:overflow-y-auto' : 'lg:overflow-y-hidden'
      } ${loading && members.length > 0 ? 'opacity-60' : ''}`}
    >
      <table className={`w-full text-sm ${showExtra ? 'min-w-[2000px]' : 'min-w-[1100px]'}`}>
        <thead>
          <tr>
            {columns.map((c) =>
              c.sortKey ? (
                <SortableTh key={c.id} label={c.label} sortKey={c.sortKey} sort={sort} onSort={onSort} />
              ) : (
                <HeadCell key={c.id}>{c.label}</HeadCell>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && members.length === 0 &&
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>
                <td colSpan={columns.length} className="px-4 py-3.5">
                  <div className="h-5 animate-pulse rounded bg-gray-100" />
                </td>
              </tr>
            ))}

          {!loading && members.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-(--c-text-3)">
                {filtered ? 'No members match your filters.' : 'No members joined in this period.'}
              </td>
            </tr>
          )}

          {members.map((member) => (
            <tr key={member.id}>
              {columns.map((c) => (
                <td key={c.id} className={`px-4 py-3 ${c.tdClass ?? ''}`}>
                  {c.cell(member, context)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

export default MemberTable;
