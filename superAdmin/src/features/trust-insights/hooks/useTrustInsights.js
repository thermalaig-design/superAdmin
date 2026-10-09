import { useEffect, useState } from 'react';

import { fetchTrustInsights } from '../services/trustInsightsService';

export function useTrustInsights({ range, from, to }) {
  const requestKey = `${range}|${from ?? ''}|${to ?? ''}`;

  // Holds the latest finished request; `loading` is derived by comparing keys.
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;

    fetchTrustInsights({ range, from, to })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '' }))
      .catch((err) =>
        !cancelled && setResult((prev) => ({ key: requestKey, data: prev.data, error: err.message }))
      );

    return () => {
      cancelled = true;
    };
  }, [range, from, to, requestKey]);

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : '',
    loading: result.key !== requestKey,
  };
}
