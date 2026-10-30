import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchDashboard } from '../services/dashboardService';

const PRESETS = ['7d', '30d', '24h'];

export function useDashboard({ range, from, to }) {
  const result = useApiQuery(['dashboard', range, from ?? '', to ?? ''], () => fetchDashboard({ range, from, to }));
  const queryClient = useQueryClient();

  // Once this range is on screen, quietly load the other quick ranges so switching to them is instant.
  const ready = Boolean(result.data);
  useEffect(() => {
    if (!ready) return;
    PRESETS.filter((preset) => preset !== range).forEach((preset) =>
      queryClient.prefetchQuery({ queryKey: ['dashboard', preset, '', ''], queryFn: () => fetchDashboard({ range: preset }) })
    );
  }, [ready, range, queryClient]);

  return result;
}
