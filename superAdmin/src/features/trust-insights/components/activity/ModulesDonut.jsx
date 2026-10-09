import { MODULE_COLORS } from '../../utils/chart';
import ChartCard, { EmptyChart } from './ChartCard';

const SIZE = 120;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ModulesDonut({ modules, total, loading }) {
  // Each segment starts where the previous one ends.
  const segments = modules.map((item, i) => {
    const length = (item.count / total) * CIRCUMFERENCE;
    const offset = modules.slice(0, i).reduce((sum, m) => sum + (m.count / total) * CIRCUMFERENCE, 0);
    return { ...item, length, offset, color: MODULE_COLORS[i % MODULE_COLORS.length] };
  });

  return (
    <ChartCard title="Top Modules">
      {modules.length === 0 ? (
        <EmptyChart loading={loading} />
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" role="img" aria-label="Activity by module">
              <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
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
                >
                  <title>{`${item.module}: ${item.count}`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold leading-none tabular-nums">{total}</span>
              <span className="mt-1 text-[0.6rem] italic text-[#6b7188]">Activities</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2 text-xs">
            {segments.map((item) => (
              <li key={item.module} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="flex-1 truncate text-[#3a3f55]">{item.module}</span>
                <span className="font-semibold tabular-nums">{item.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

export default ModulesDonut;
