import { useState } from 'react';

import { formatTimestamp } from '../../utils/chart';

const PAGE_SIZE = 10;

const th = 'px-4 py-3 text-left text-sm font-semibold text-[#5b627a]';

const pagerButton =
  'cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

function RecentActivityTable({ rows, loading }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      <h3 className="text-sm font-semibold">Recent User Panel Activity</h3>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#fbf6f3]">
            <tr>
              <th className={th}>Timestamp</th>
              <th className={th}>User</th>
              <th className={th}>Page Name</th>
              <th className={th}>Route</th>
              <th className={th}>Module</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && rows.length === 0 &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3.5">
                    <div className="h-5 animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#5b627a]">
                  No activity found for the selected filters.
                </td>
              </tr>
            )}

            {visible.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#3a3f55]">{formatTimestamp(row.createdAt)}</td>
                <td className="px-4 py-3 font-medium">{row.user}</td>
                <td className="px-4 py-3 text-[#3a3f55]">{row.pageName}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#3a3f55]">{row.route}</td>
                <td className="px-4 py-3 text-[#3a3f55]">{row.module}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-xs text-[#5b627a]">
          <span className="tabular-nums">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length} latest
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className={pagerButton} disabled={current === 1} onClick={() => setPage(current - 1)}>
              Previous
            </button>
            <button type="button" className={pagerButton} disabled={current === pageCount} onClick={() => setPage(current + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecentActivityTable;
