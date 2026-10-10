import { useEffect, useState } from 'react';

import { fetchMemberSummary, fetchTrustOptions } from '../services/memberInsightsService';

/** Loads the summary cards and the trust dropdown options once. */
export function useMemberSummary() {
  const [state, setState] = useState({ summary: null, trusts: [], error: '', ready: false });

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMemberSummary(), fetchTrustOptions()])
      .then(([summary, trusts]) => !cancelled && setState({ summary, trusts, error: '', ready: true }))
      .catch((err) => !cancelled && setState((prev) => ({ ...prev, error: err.message, ready: true })));

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
