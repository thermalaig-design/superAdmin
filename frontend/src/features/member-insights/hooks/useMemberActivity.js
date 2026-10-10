import { useEffect, useState } from 'react';

import { fetchMemberActivity } from '../services/memberInsightsService';

export function useMemberActivity(memberId, { trust, range, from, to, target }) {
  const requestKey = [memberId, trust, range, from, to, target].map((v) => v ?? '').join('|');

  // Holds the latest finished request; `loading` is derived by comparing keys.
  const [result, setResult] = useState({ key: null, data: null, error: '', loadedAt: null });

  useEffect(() => {
    let cancelled = false;

    fetchMemberActivity(memberId, { trust, range, from, to, target })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '', loadedAt: Date.now() }))
      .catch((err) => !cancelled && setResult((prev) => ({ ...prev, key: requestKey, error: err.message })));

    return () => {
      cancelled = true;
    };
  }, [memberId, trust, range, from, to, target, requestKey]);

  return {
    data: result.data,
    loadedAt: result.loadedAt,
    error: result.key === requestKey ? result.error : '',
    loading: result.key !== requestKey,
  };
}
