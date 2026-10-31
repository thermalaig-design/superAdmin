import { useEffect } from 'react';

import SortableTh, { HeadCell } from '../../../components/SortableTh';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { TRUST_COLUMNS } from '../utils/trustColumns';

/**
 * One page of trusts. Searching, sorting and paging are decided by the parent.
 * `pinned` is true once the panel holding this table has stuck to the top of the screen: only then do the
 * rows scroll inside the box, so before that the mouse wheel moves the page and brings the table into place.
 * `showExtra` shows the less important columns too (see TRUST_COLUMNS).
 */
function TrustTable({ trusts, loading, filter, sort, onSort, searching = false, pinned = false, scrollResetKey, showExtra = false, onDetails }) {
  const scrollRef = useDragScroll();
  const columns = TRUST_COLUMNS.filter((c) => showExtra || !c.extra);

  // A new page / sort / search shows its first rows, not wherever the previous rows were scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollRef, scrollResetKey]);

  return (
    // The header stays fixed inside the box. Scrollbars are hidden, so a mouse can also drag the table
    // to pan it; wheel, trackpad and touch work as usual.
    <div
      ref={scrollRef}
      className={`scrollbar-none max-lg:hidden max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-gray-200 lg:max-h-none lg:min-h-0 lg:flex-1 ${
        pinned ? 'lg:overflow-y-auto' : 'lg:overflow-y-hidden'
      }`}
    >
      <table className={`w-full text-sm ${showExtra ? 'min-w-[1850px]' : 'min-w-[1150px]'}`}>
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
          {loading && trusts.length === 0 &&
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td colSpan={columns.length} className="px-4 py-3.5">
                  <div className="h-5 animate-pulse rounded bg-gray-100" />
                </td>
              </tr>
            ))}

          {!loading && trusts.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-(--c-text-3)">
                {searching ? 'No trusts match your search.' : 'No trusts were created in this period.'}
              </td>
            </tr>
          )}

          {trusts.map((trust) => (
            <tr key={trust.id}>
              {columns.map((c) => (
                <td key={c.id} className={`px-4 py-3 ${c.tdClass ?? ''}`}>
                  {c.cell(trust, { filter, onDetails })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TrustTable;
