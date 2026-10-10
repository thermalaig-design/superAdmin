import ChartCard, { EmptyChart } from './ChartCard';

function RoutesChart({ routes, loading }) {
  const max = Math.max(1, ...routes.map((r) => r.count));

  return (
    <ChartCard title="Most Visited Routes">
      {routes.length === 0 ? (
        <EmptyChart loading={loading} />
      ) : (
        <ul className="space-y-3">
          {routes.map((item) => (
            <li key={item.route} title={`${item.name} (${item.route})`} className="flex items-center gap-3 text-sm">
              <span className="w-44 shrink-0 truncate text-[#3a3f55]">{item.route}</span>
              <span className="h-2.5 flex-1 rounded-full bg-gray-100">
                <span
                  className="block h-full rounded-full bg-[#e8793f]"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </span>
              <span className="w-7 shrink-0 text-right font-semibold tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

export default RoutesChart;
