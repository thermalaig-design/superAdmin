import { formatHour, niceMax, yTicks } from '../../utils/chart';
import ChartCard, { EmptyChart } from './ChartCard';

const W = 360;
const H = 190;
const PAD = { top: 10, right: 8, bottom: 26, left: 30 };

function HourChart({ byHour, loading }) {
  const hasData = byHour.some((h) => h.count > 0);
  const max = niceMax(Math.max(0, ...byHour.map((h) => h.count)));
  const ticks = yTicks(max);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / 24;
  const barWidth = slot * 0.62;
  const y = (count) => PAD.top + innerH - (count / max) * innerH;

  return (
    <ChartCard title="Activity by Hour">
      {!hasData ? (
        <EmptyChart loading={loading} />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Activity by hour of day">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" />
              <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#6b7188">
                {tick}
              </text>
            </g>
          ))}

          {byHour.map(({ hour, count }) => (
            <g key={hour}>
              {count > 0 && (
                <rect
                  x={PAD.left + hour * slot + (slot - barWidth) / 2}
                  y={y(count)}
                  width={barWidth}
                  height={PAD.top + innerH - y(count)}
                  rx="1.5"
                  fill="#b04a4f"
                >
                  <title>{`${formatHour(hour)}: ${count}`}</title>
                </rect>
              )}
              {hour % 3 === 0 && (
                <text x={PAD.left + hour * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="8.5" fill="#6b7188">
                  {formatHour(hour)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </ChartCard>
  );
}

export default HourChart;
