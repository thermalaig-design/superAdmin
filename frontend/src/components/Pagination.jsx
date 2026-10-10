const PAGE_SIZES = [10, 25, 50, 100];

const button =
  'flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-2 text-xs font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

const number = (n) => n.toLocaleString('en-IN');

/** Footer for server-paged tables. `page` is 1-based. */
function Pagination({ page, pageSize, total, loading, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex shrink-0 flex-col gap-3 text-xs text-[#5b627a] sm:flex-row sm:items-center sm:justify-between">
      <span className="tabular-nums">
        Showing {number(first)}–{number(last)} of {number(total)}
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs outline-none focus:border-[#e8793f]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5">
          <button type="button" className={button} disabled={page === 1 || loading} onClick={() => onPageChange(1)} aria-label="First page">
            «
          </button>
          <button type="button" className={button} disabled={page === 1 || loading} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span className="px-2 tabular-nums">
            Page {number(page)} of {number(pageCount)}
          </span>
          <button type="button" className={button} disabled={page >= pageCount || loading} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
          <button type="button" className={button} disabled={page >= pageCount || loading} onClick={() => onPageChange(pageCount)} aria-label="Last page">
            »
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
