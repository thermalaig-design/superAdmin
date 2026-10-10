import { useEffect, useState } from 'react';

import { fetchMembers } from '../services/memberInsightsService';

/**
 * Loads one page of members. The previous page stays on screen while the next one loads,
 * and `loading` is derived by comparing request keys.
 */
export function useMemberList({ page, pageSize, sortBy, sort, search, trust, appDownload, range, from, to }) {
  const requestKey = [page, pageSize, sortBy, sort, search, trust, appDownload, range, from, to].map((v) => v ?? '').join('|');
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;

    fetchMembers({ page, pageSize, sortBy, sort, search, trust, appDownload, range, from, to })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '' }))
      .catch((err) =>
        !cancelled && setResult((prev) => ({ key: requestKey, data: prev.data, error: err.message }))
      );

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sortBy, sort, search, trust, appDownload, range, from, to, requestKey]);

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : '',
    loading: result.key !== requestKey,
  };
}
