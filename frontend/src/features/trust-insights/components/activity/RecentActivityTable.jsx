import { useState } from 'react';

import ScrollTable from '../../../../components/ScrollTable';
import { formatTimestamp } from '../../utils/chart';

const PAGE_SIZE = 10;

const th = 'px-4 py-3 text-left text-sm font-semibold text-[#5b627a]';

const pagerButton =
  'cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Latest activity. A table on every screen size: when it does not fit it scrolls sideways (drag or swipe) with
 * every column scrolling together, like the Organization and Member tables.
 */
function RecentActivityTable({ rows, loading, showTrust = false }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      <h3 className="text-sm font-semibold">{showTrust ? 'Recent Member Activity' : 'Recent User Panel Activity'}</h3>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-200 px-4 py-12 text-center text-sm text-[#5b627a]">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : (
            'No activity found for the selected filters.'
          )}
        </div>
      ) : (
        <>
          <ScrollTable className="mt-4">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[#fbf6f3]">
                <tr>
                  <th className={th}>Timestamp</th>
                  <th className={th}>{showTrust ? 'Trust' : 'User'}</th>
                  <th className={th}>Page Name</th>
                  <th className={th}>Route</th>
                  <th className={th}>Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#3a3f55]">{formatTimestamp(row.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{showTrust ? row.trustName : row.user}</td>
                    <td className="px-4 py-3 text-[#3a3f55]">{row.pageName}</td>
                    <td className="break-all px-4 py-3 font-mono text-xs text-[#3a3f55]">{row.route}</td>
                    <td className="px-4 py-3 text-[#3a3f55]">{row.module}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        </>
      )}

      {rows.length > PAGE_SIZE && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5b627a]">
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
