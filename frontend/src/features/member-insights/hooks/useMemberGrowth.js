import { useEffect, useState } from 'react';

import { fetchMemberGrowth } from '../services/memberInsightsService';

/** Members joined over the selected period, for the graph. `loadedAt` lets the graph stop at the current hour. */
export function useMemberGrowth({ range, from, to }) {
  const requestKey = [range, from, to].map((v) => v ?? '').join('|');
  const [result, setResult] = useState({ key: null, data: null, error: '', loadedAt: null });

  useEffect(() => {
    let cancelled = false;

    fetchMemberGrowth({ range, from, to })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '', loadedAt: Date.now() }))
      .catch((err) => !cancelled && setResult((prev) => ({ ...prev, key: requestKey, error: err.message })));

    return () => {
      cancelled = true;
    };
  }, [range, from, to, requestKey]);

  return {
    data: result.data,
    loadedAt: result.loadedAt,
    error: result.key === requestKey ? result.error : '',
    loading: result.key !== requestKey,
  };
}
