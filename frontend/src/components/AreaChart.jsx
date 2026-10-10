import { useEffect, useId, useRef, useState } from 'react';

import { niceMax, smoothPath } from '../utils/chartMath';

const PAD = { top: 10, right: 24, bottom: 26, left: 30 };
const DOTS_UNTIL = 31; // draw a dot on every point only while the line is not crowded
const LINE = '#d9631f';

/** y-axis top: a "nice" number that splits evenly into four gridline steps. */
const axisMax = (peak) => Math.ceil(niceMax(peak) / 4) * 4;

/**
 * Smooth area chart of counts over time, with a hover tooltip.
 *
 * `series` is { buckets: [{ from, count, label, title }], total, max }: `label` goes on the x axis,
 * `title` is the tooltip heading. `noun` / `nounPlural` name what is being counted ("trust", "activity", …).
 */
function AreaChart({ title, series, loading, noun, nounPlural = `${noun}s`, emptyText, height = 160 }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [width, setWidth] = useState(520);
  const [active, setActive] = useState(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { buckets, total, max: peak } = series;
  const n = buckets.length;
  const top = axisMax(peak);

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const baseline = PAD.top + innerH;

  const points = buckets.map((bucket, i) => ({
    x: PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: baseline - (bucket.count / top) * innerH,
  }));

  const linePath = smoothPath(points);
  const areaPath = n > 1 ? `${linePath} L${points[n - 1].x},${baseline} L${points[0].x},${baseline} Z` : '';

  // At most one x label per ~70px, always including the first point.
  const labelStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 70))));
  const ticks = [0, 1, 2, 3, 4].map((step) => ({ value: (top / 4) * step, y: baseline - (step / 4) * innerH }));

  const handlePointer = (event) => {
    if (n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - PAD.left) / innerW;
    setActive(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
  };

  const hovered = active !== null && active < n ? { bucket: buckets[active], point: points[active] } : null;
  const empty = !loading && n > 0 && total === 0;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <h3 className="truncate text-sm font-semibold">{title}</h3>

      <div ref={wrapRef} className={`relative mt-3 flex-1 transition-opacity ${loading && n > 0 ? 'opacity-60' : ''}`} style={{ minHeight: height }}>
        {n === 0 ? (
          <div className="h-full animate-pulse rounded-xl bg-gray-50" style={{ minHeight: height }} />
        ) : (
          <>
            <svg
              ref={svgRef}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="block touch-pan-y select-none"
              role="img"
              aria-label={`${title}: ${total} ${total === 1 ? noun : nounPlural}`}
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setActive(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={LINE} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={tick.y}
                    y2={tick.y}
                    stroke={tick.value === 0 ? '#e3d9d2' : '#efe6df'}
                    strokeDasharray={tick.value === 0 ? undefined : '3 4'}
                  />
                  <text x={PAD.left - 8} y={tick.y + 3.5} textAnchor="end" fontSize="11" fill="#7b8196" className="tabular-nums">
                    {tick.value}
                  </text>
                </g>
              ))}

              {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
              {n > 1 && <path d={linePath} fill="none" stroke={LINE} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />}

              {n <= DOTS_UNTIL &&
                points.map((p, i) => <circle key={buckets[i].from} cx={p.x} cy={p.y} r="2.6" fill={LINE} stroke="#fff" strokeWidth="1" />)}

              {buckets.map(
                (bucket, i) =>
                  i % labelStep === 0 && (
                    <text key={bucket.from} x={points[i].x} y={height - 8} textAnchor="middle" fontSize="11" fill="#7b8196">
                      {bucket.label}
                    </text>
                  )
              )}

              {hovered && (
                <g pointerEvents="none">
                  <line x1={hovered.point.x} x2={hovered.point.x} y1={PAD.top} y2={baseline} stroke={LINE} strokeOpacity="0.45" strokeDasharray="3 3" />
                  <circle cx={hovered.point.x} cy={hovered.point.y} r="5.5" fill="#fff" stroke={LINE} strokeWidth="2.25" />
                </g>
              )}
            </svg>

            {hovered && (
              <div
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(80,40,60,0.15)]"
                style={{
                  left: Math.min(Math.max(hovered.point.x, 80), width - 80),
                  top: Math.max(hovered.point.y - 12, 44),
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <p className="font-medium text-[#3a3f55]">{hovered.bucket.title}</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: LINE }} />
                  {hovered.bucket.count} {hovered.bucket.count === 1 ? noun : nounPlural}
                </p>
              </div>
            )}

            {empty && (
              <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-[#7b8196]">{emptyText}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AreaChart;
