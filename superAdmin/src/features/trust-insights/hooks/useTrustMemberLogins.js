import { useEffect, useState } from 'react';

import { fetchTrustMemberLogins } from '../services/trustInsightsService';

export function useTrustMemberLogins(trustId) {
  // Holds the latest finished request; `loading` is derived by comparing ids.
  const [result, setResult] = useState({ trustId: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;

    fetchTrustMemberLogins(trustId)
      .then((data) => !cancelled && setResult({ trustId, data, error: '' }))
      .catch((err) => !cancelled && setResult({ trustId, data: null, error: err.message }));

    return () => {
      cancelled = true;
    };
  }, [trustId]);

  const settled = result.trustId === trustId;

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : '',
    loading: !settled,
  };
}
