import { useEffect, useState } from 'react';

import { fetchTrustActivity } from '../services/trustInsightsService';

export function useTrustActivity(trustId, { range, from, to, user, target }) {
  const requestKey = [trustId, range, from, to, user, target].map((v) => v ?? '').join('|');

  // Holds the latest finished request; `loading` is derived by comparing keys.
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;

    fetchTrustActivity(trustId, { range, from, to, user, target })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '' }))
      .catch((err) =>
        !cancelled && setResult((prev) => ({ key: requestKey, data: prev.data, error: err.message }))
      );

    return () => {
      cancelled = true;
    };
  }, [trustId, range, from, to, user, target, requestKey]);

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : '',
    loading: result.key !== requestKey,
  };
}
