import { useEffect, useState } from 'react';

import { fetchMemberTrusts } from '../services/memberInsightsService';

/** Loads every trust one member belongs to. `loading` is derived by comparing which member the result is for. */
export function useMemberTrusts(memberId) {
  const [result, setResult] = useState({ memberId: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;

    fetchMemberTrusts(memberId)
      .then((data) => !cancelled && setResult({ memberId, data, error: '' }))
      .catch((err) => !cancelled && setResult({ memberId, data: null, error: err.message }));

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const settled = result.memberId === memberId;

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : '',
    loading: !settled,
  };
}
