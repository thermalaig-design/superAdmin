import SortArrows from './SortArrows';

// Sticky header cells: the inset shadow draws the bottom border, since real borders don't stay attached when sticky.
export const STICKY_TH =
  'sticky top-0 z-10 whitespace-nowrap bg-[#fbf6f3] px-4 py-3 text-left text-sm font-semibold text-[#5b627a] shadow-[inset_0_-1px_0_#e5e7eb]';

/** A plain column header that stays fixed at the top of a scrolling table. */
export function HeadCell({ children }) {
  return <th className={STICKY_TH}>{children}</th>;
}

/** A column header that sorts the whole table when clicked. `sort` is { key, dir }. */
function SortableTh({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;

  return (
    <th className={STICKY_TH} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label}`}
        className={`inline-flex cursor-pointer items-center gap-1.5 font-semibold hover:text-[#b04a4f] ${active ? 'text-[#b04a4f]' : ''}`}
      >
        {label}
        <SortArrows direction={active ? sort.dir : null} />
      </button>
    </th>
  );
}

export default SortableTh;
