import { formatDayKey, niceMax, yTicks } from '../../utils/chart';
import ChartCard, { EmptyChart } from './ChartCard';

const W = 360;
const H = 190;
const PAD = { top: 10, right: 12, bottom: 26, left: 30 };

function TrendChart({ trend, loading }) {
  const hasData = trend.some((p) => p.count > 0);
  const max = niceMax(Math.max(0, ...trend.map((p) => p.count)));
  const ticks = yTicks(max);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
  const y = (count) => PAD.top + innerH - (count / max) * innerH;

  const labelEvery = Math.ceil(trend.length / 6);
  const points = trend.map((p, i) => `${x(i)},${y(p.count)}`).join(' ');

  return (
    <ChartCard title="Activity Trend">
      {!hasData ? (
        <EmptyChart loading={loading} />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Activity trend">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" />
              <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#6b7188">
                {tick}
              </text>
            </g>
          ))}

          {trend.length > 1 && <polyline points={points} fill="none" stroke="#e8793f" strokeWidth="2" strokeLinejoin="round" />}

          {trend.map((p, i) => (
            <g key={p.date}>
              <circle cx={x(i)} cy={y(p.count)} r="3.5" fill="#e8793f" stroke="#fff" strokeWidth="1.5">
                <title>{`${formatDayKey(p.date)}: ${p.count}`}</title>
              </circle>
              {i % labelEvery === 0 && (
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#6b7188">
                  {formatDayKey(p.date)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </ChartCard>
  );
}

export default TrendChart;
