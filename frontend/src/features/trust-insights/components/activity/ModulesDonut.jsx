import { useState } from 'react';

import { MODULE_COLORS } from '../../utils/chart';
import ChartCard, { EmptyChart } from './ChartCard';

const SIZE = 156;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const number = (n) => n.toLocaleString('en-IN');

/** Share of activity per module: a donut with the total in the middle, a legend, and an optional details table. */
function ModulesDonut({ modules, total, loading }) {
  const [showDetails, setShowDetails] = useState(false);
  const [focus, setFocus] = useState(null); // module under the pointer: the other segments fade

  // Each segment starts where the previous one ends.
  const segments = modules.map((item, i) => {
    const length = (item.count / total) * CIRCUMFERENCE;
    const offset = modules.slice(0, i).reduce((sum, m) => sum + (m.count / total) * CIRCUMFERENCE, 0);
    return { ...item, length, offset, color: MODULE_COLORS[i % MODULE_COLORS.length] };
  });

  const detailsButton = modules.length > 0 && (
    <button
      type="button"
      onClick={() => setShowDetails((open) => !open)}
      aria-expanded={showDetails}
      className="cursor-pointer text-xs font-medium text-[#b04a4f] hover:underline"
    >
      {showDetails ? 'Hide details ‹' : 'View details ›'}
    </button>
  );

  return (
    <ChartCard title="Top Modules" action={detailsButton}>
      {modules.length === 0 ? (
        <EmptyChart loading={loading} />
      ) : (
        <>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" role="img" aria-label="Activity by module">
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f3f0ed" strokeWidth={STROKE} />
                {segments.map((item) => (
                  <circle
                    key={item.module}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${item.length} ${CIRCUMFERENCE - item.length}`}
                    strokeDashoffset={-item.offset}
                    opacity={focus && focus !== item.module ? 0.3 : 1}
                    className="transition-opacity"
                    onPointerEnter={() => setFocus(item.module)}
                    onPointerLeave={() => setFocus(null)}
                  >
                    <title>{`${item.module}: ${number(item.count)} (${item.percent}%)`}</title>
                  </circle>
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold leading-none tabular-nums">{number(total)}</span>
                <span className="mt-1 text-[0.7rem] italic text-[#6b7188]">Activities</span>
              </div>
            </div>

            <ul className="w-full min-w-0 flex-1 space-y-2.5 text-sm">
              {segments.map((item) => (
                <li
                  key={item.module}
                  className={`flex items-center gap-2.5 transition-opacity ${focus && focus !== item.module ? 'opacity-40' : ''}`}
                  onPointerEnter={() => setFocus(item.module)}
                  onPointerLeave={() => setFocus(null)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="min-w-0 flex-1 truncate text-[#3a3f55]" title={item.module}>
                    {item.module}
                  </span>
                  <span className="font-semibold tabular-nums">{item.percent}%</span>
                </li>
              ))}
            </ul>
          </div>

          {showDetails && (
            <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-[#fbf6f3] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7188]">
                  <tr>
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5 text-right">Activities</th>
                    <th className="px-4 py-2.5 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {segments.map((item) => (
                    <tr key={item.module}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                          {item.module}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{number(item.count)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{item.percent}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-[#fbf6f3]/60 font-semibold">
                  <tr>
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{number(total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}

export default ModulesDonut;
